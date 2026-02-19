import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const TimeUtils = {
    now: () => dayjs().toDate(),

    toDiscordTimestamp: (date: Date, format: 'R' | 'F' | 'd' = 'R') => {
        return `<t:${Math.floor(date.getTime() / 1000)}:${format}>`;
    },

    diffSeconds: (from: Date, to: Date = new Date()) => {
        return dayjs(to).diff(dayjs(from), 'second');
    }
};
