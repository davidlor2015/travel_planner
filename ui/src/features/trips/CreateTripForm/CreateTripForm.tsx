import { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { createTrip, type Trip } from '../../../shared/api/trips';
import { track } from '../../../shared/analytics';
import {
  tripSchema,
  serializePreferences,
  type TripFormData,
  BUDGET_OPTIONS,
  PACE_OPTIONS,
  INTEREST_OPTIONS,
} from '../schemas/tripSchema';
import { FormField } from '../../../shared/ui/FormField';
import { inputCls } from '../../../shared/ui/inputCls';

interface CreateTripFormProps {
  token: string;
  onSuccess: (newTrip: Trip) => void;
  onCancel: () => void;
  defaultDestination?: string;
}

export const CreateTripForm = ({ token, onSuccess, onCancel, defaultDestination }: CreateTripFormProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      destination: defaultDestination ?? '',
      interests: [],
    },
  });

  const startDate = useWatch({ control, name: 'start_date' });

  const toggleInterest = (interest: string, onChange: (v: string[]) => void) => {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((i) => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(next);
    onChange(next);
  };

  const onSubmit = async (data: TripFormData) => {
    try {
      const notes = serializePreferences(data);
      const newTrip = await createTrip(token, {
        title:       data.title,
        destination: data.destination,
        start_date:  data.start_date,
        end_date:    data.end_date,
        notes:       notes || undefined,
      });
      track({
        name: 'trip_created',
        props: {
          trip_id: newTrip.id,
          destination: newTrip.destination,
          has_preferences: Boolean(notes),
        },
      });
      onSuccess(newTrip);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create trip. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3EEE7] px-4 py-6 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.52 }}
        className="mx-auto w-full max-w-[560px] rounded-[20px] border border-smoke/60 bg-[#FEFCF9] p-6 shadow-[0_8px_40px_rgba(28,17,8,0.08)] sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-flint transition-colors hover:text-espresso"
          >
            Cancel
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-espresso tracking-tight">Create Trip</h2>
          <span className="w-[64px]" aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Core details</p>
              <p className="mt-1 text-sm text-flint">
                Start with destination and dates. You can generate and refine the itinerary right after this.
              </p>
            </div>

            <FormField id="ctf-title" label="Trip title" error={errors.title?.message}>
              <input
                id="ctf-title"
                placeholder="e.g. Summer in Rome"
                className={inputCls(!!errors.title)}
                {...register('title')}
              />
            </FormField>

            <FormField id="ctf-destination" label="Destination" error={errors.destination?.message}>
              <input
                id="ctf-destination"
                placeholder="e.g. Rome, Italy"
                className={inputCls(!!errors.destination)}
                {...register('destination')}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <FormField id="ctf-start-date" label="Start date" error={errors.start_date?.message}>
                <input id="ctf-start-date" type="date" className={inputCls(!!errors.start_date)} {...register('start_date')} />
              </FormField>
              <FormField id="ctf-end-date" label="End date" error={errors.end_date?.message}>
                <input id="ctf-end-date" type="date" min={startDate || undefined} className={inputCls(!!errors.end_date)} {...register('end_date')} />
              </FormField>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#EAE2D6] bg-[#FAF8F5] p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Optional guidance</p>
              <p className="mt-1 text-sm text-flint">
                These preferences help shape the first itinerary draft without adding friction to trip creation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <FormField id="ctf-budget" label="Budget" hint="Optional" error={errors.budget?.message}>
                <select id="ctf-budget" className={inputCls(!!errors.budget)} {...register('budget')}>
                  <option value="">Select budget</option>
                  {BUDGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField id="ctf-pace" label="Pace" hint="Optional" error={errors.pace?.message}>
                <select id="ctf-pace" className={inputCls(!!errors.pace)} {...register('pace')}>
                  <option value="">Select pace</option>
                  {PACE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-espresso">
                Interests <span className="font-normal text-flint">(Optional)</span>
              </span>
              <Controller
                name="interests"
                control={control}
                render={({ field: { onChange } }) => (
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest, onChange)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                            active
                              ? 'border-espresso bg-espresso text-white'
                              : 'border-smoke bg-white text-flint hover:border-espresso hover:text-espresso'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              <p className="text-xs text-flint">Budget, pace, and interests are passed into itinerary generation.</p>
            </div>
          </div>

          <AnimatePresence>
            {errors.root && (
              <motion.div
                key="root-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                role="alert"
                className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {errors.root.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-1">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.01 } : undefined}
              whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
              className="w-full rounded-full bg-amber py-3 text-sm font-bold text-white shadow-sm shadow-amber/25 transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Trip'}
            </motion.button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
