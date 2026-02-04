import { cachedApiRequest } from './client.js';
import type { Tour, Tournament } from './types.js';

interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
  season?: {
    year: number;
    type: number;
  };
}

interface ESPNEvent {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  endDate?: string;
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
    };
  };
  competitions?: {
    id: string;
    purse?: number;
    venue?: {
      fullName?: string;
      address?: {
        city?: string;
        state?: string;
        country?: string;
      };
    };
  }[];
}

export async function fetchTournaments(tour: Tour): Promise<Tournament[]> {
  try {
    const response = await cachedApiRequest<ESPNScoreboardResponse>(`/${tour}/scoreboard`, {
      ttlMs: 2 * 60 * 1000,
    });
    
    if (!response.events) {
      return [];
    }

    return response.events.map((event): Tournament => {
      const competition = event.competitions?.[0];
      const statusState = event.status?.type?.state || 'pre';
      const status = statusState === 'in' ? 'in' : statusState === 'post' ? 'post' : 'pre';

      const venue = competition?.venue;
      const locationParts: string[] = [];
      if (venue?.address?.city) locationParts.push(venue.address.city);
      if (venue?.address?.state) locationParts.push(venue.address.state);
      if (venue?.address?.country && venue.address.country !== 'USA') {
        locationParts.push(venue.address.country);
      }

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        endDate: event.endDate,
        venue: venue?.fullName,
        location: locationParts.join(', '),
        purse: competition?.purse ? `$${(competition.purse / 1000000).toFixed(1)}M` : undefined,
        status,
        tour,
      };
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return [];
  }
}

export async function fetchSchedule(tour: Tour): Promise<Tournament[]> {
  try {
    const response = await cachedApiRequest<ESPNScoreboardResponse>(`/${tour}/scoreboard`, {
      params: { dates: `${new Date().getFullYear()}` },
      ttlMs: 6 * 60 * 60 * 1000,
    });
    
    if (!response.events) {
      return [];
    }

    return response.events.map((event): Tournament => {
      const competition = event.competitions?.[0];
      const statusState = event.status?.type?.state || 'pre';
      const status = statusState === 'in' ? 'in' : statusState === 'post' ? 'post' : 'pre';

      const venue = competition?.venue;
      const locationParts: string[] = [];
      if (venue?.address?.city) locationParts.push(venue.address.city);
      if (venue?.address?.state) locationParts.push(venue.address.state);

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        endDate: event.endDate,
        venue: venue?.fullName,
        location: locationParts.join(', '),
        purse: competition?.purse ? `$${(competition.purse / 1000000).toFixed(1)}M` : undefined,
        status,
        tour,
      };
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }
}
