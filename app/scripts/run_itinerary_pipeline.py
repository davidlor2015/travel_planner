# Path: app/scripts/run_itinerary_pipeline.py
# Summary: Implements run itinerary pipeline functionality.

# app/scripts/run_itinerary_pipeline.py
"""
End-to-end itinerary pipeline: generate → embed → upsert to pgvector.

Run:
    python -m app.scripts.run_itinerary_pipeline [options]

Steps:
  1. Generate itinerary records via Ollama and write to JSON
  2. Embed each chunk and upsert into the itinerary_chunks table

Both steps are individually skippable via --skip-generate / --skip-embed,
so the same command drives partial re-runs without touching source files.

Examples:
    # Full run, default 20 records
    python -m app.scripts.run_itinerary_pipeline

    # Full run, all ~288 combinations
    python -m app.scripts.run_itinerary_pipeline --max-records 0

    # Re-embed an already-generated file (skip the slow Ollama generation)
    python -m app.scripts.run_itinerary_pipeline --skip-generate

    # Custom models, custom output path
    python -m app.scripts.run_itinerary_pipeline \\
        --gen-model qwen2.5:14b \\
        --embed-model mxbai-embed-large \\
        --output-path data/my_batch.json \\
        --max-records 50
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from app.scripts.embed_itineraries import DEFAULT_BATCH_SIZE
from app.scripts.embed_itineraries import run as embed
from app.scripts.generate_itineraries import DEFAULT_MAX_RECORDS
from app.scripts.generate_itineraries import DEFAULT_MODEL as DEFAULT_GEN_MODEL
from app.scripts.generate_itineraries import OUTPUT_PATH as DEFAULT_OUTPUT_PATH
from app.scripts.generate_itineraries import run as generate
from app.services.embedding_service import MODEL_NAME as DEFAULT_EMBED_MODEL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate travel itineraries and index them in pgvector.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--output-path", default=str(DEFAULT_OUTPUT_PATH), metavar="PATH",
        help=f"JSON file for generated itineraries (default: {DEFAULT_OUTPUT_PATH})",
    )
    parser.add_argument(
        "--max-records", type=int,
        default=DEFAULT_MAX_RECORDS if DEFAULT_MAX_RECORDS is not None else 0,
        metavar="N",
        help="Records to generate; 0 = all combinations (default: 20)",
    )
    parser.add_argument(
        "--gen-model", default=DEFAULT_GEN_MODEL, metavar="MODEL",
        help=f"Ollama model for generation (default: {DEFAULT_GEN_MODEL})",
    )
    parser.add_argument(
        "--embed-model", default=DEFAULT_EMBED_MODEL, metavar="MODEL",
        help=f"Ollama model for embeddings (default: {DEFAULT_EMBED_MODEL})",
    )
    parser.add_argument(
        "--batch-size", type=int, default=DEFAULT_BATCH_SIZE, metavar="N",
        help=f"Embedding/upsert batch size (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--shuffle", action="store_true",
        help="Shuffle combinations before slicing so --max-records picks diverse locations",
    )
    parser.add_argument(
        "--skip-generate", action="store_true",
        help="Skip generation; use the existing file at --output-path",
    )
    parser.add_argument(
        "--skip-embed", action="store_true",
        help="Skip embedding/indexing (generate only)",
    )
    return parser.parse_args()


def _print_summary(
    gen_stats: dict | None,
    embed_stats: dict | None,
    elapsed: float,
) -> None:
    sep = "─" * 50
    print(f"\n{sep}")
    print("  Pipeline Summary")
    print(sep)

    if gen_stats is not None:
        status = "OK" if gen_stats["failed"] == 0 else f"{gen_stats['failed']} failed"
        print(f"  Generation   : {gen_stats['succeeded']} records  [{status}]")
        print(f"  Output       : {gen_stats['output_path']}")
    else:
        print("  Generation   : skipped")

    if embed_stats is not None:
        print(
            f"  Embedding    : {embed_stats['records_valid']} records → "
            f"{embed_stats['chunks_inserted']} chunks inserted"
        )
        if embed_stats["records_skipped"]:
            print(f"  Skipped      : {embed_stats['records_skipped']} invalid record(s)")
        print(f"  DB total     : {embed_stats['total_rows']} rows in itinerary_chunks")
    else:
        print("  Embedding    : skipped")

    print(f"  Elapsed      : {elapsed:.1f}s")
    print(sep)


def main() -> None:
    args = _parse_args()
    output_path = Path(args.output_path)
    t_start = time.monotonic()

    gen_stats: dict | None = None
    embed_stats: dict | None = None

    # ── Step 1: Generate ──────────────────────────────────────────────────────
    if args.skip_generate:
        if not output_path.exists():
            logger.error(
                "--skip-generate was set but no file exists at: %s", output_path
            )
            sys.exit(1)
        logger.info("Skipping generation — using existing file: %s", output_path)
    else:
        logger.info("=== Step 1/2: Generating itineraries ===")
        gen_stats = generate(
            output_path=output_path,
            max_records=args.max_records if args.max_records > 0 else None,
            model=args.gen_model,
            shuffle=args.shuffle,
        )
        if gen_stats["succeeded"] == 0:
            logger.error("No records were generated successfully. Aborting.")
            sys.exit(1)

    # ── Step 2: Embed + upsert ────────────────────────────────────────────────
    if not args.skip_embed:
        logger.info("=== Step 2/2: Embedding and indexing ===")
        try:
            embed_stats = embed(
                data_path=output_path,
                embed_model=args.embed_model,
                batch_size=args.batch_size,
            )
        except FileNotFoundError as exc:
            logger.error("%s", exc)
            sys.exit(1)
        except Exception as exc:
            logger.error("Embedding step failed: %s", exc)
            sys.exit(1)
    else:
        logger.info("Skipping embedding step.")

    _print_summary(gen_stats, embed_stats, time.monotonic() - t_start)


if __name__ == "__main__":
    main()
