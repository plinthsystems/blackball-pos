type PauseInterval = {
  pausedAt: Date;
  resumedAt: Date | null;
};

export function calculateBillableSeconds(input: {
  startedAt: Date;
  endedAt: Date;
  pauses: PauseInterval[];
}) {
  const totalSeconds = Math.max(0, Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000));
  const pausedSeconds = input.pauses.reduce((sum, pause) => {
    if (!pause.resumedAt) {
      return sum;
    }

    return sum + Math.max(0, Math.floor((pause.resumedAt.getTime() - pause.pausedAt.getTime()) / 1000));
  }, 0);

  return Math.max(0, totalSeconds - pausedSeconds);
}

export function calculateTableCharge(input: {
  billableSeconds: number;
  halfHourAmount: number;
  fullHourAmount: number;
}) {
  const fullHours = Math.floor(input.billableSeconds / 3600);
  const remainingSeconds = input.billableSeconds % 3600;
  const halfHourBlocks = remainingSeconds === 0 ? 0 : Math.ceil(remainingSeconds / 1800);

  return fullHours * input.fullHourAmount + halfHourBlocks * input.halfHourAmount;
}

export function calculateMinuteBasedTableCharge(input: {
  billableSeconds: number;
  hourlyRate: number;
}) {
  const billableMinutes = Math.ceil(Math.max(0, input.billableSeconds) / 60);
  return Math.round(((billableMinutes * input.hourlyRate) / 60) * 100) / 100;
}
