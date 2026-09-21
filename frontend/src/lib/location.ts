/**
 * Universal robust location utility for CivicDrishti Bharat
 * Triggers Browser Native Location Prompt ("Allow", "Allow for only now", "Don't allow")
 * with intelligent fallback if permission is denied.
 */

export interface LocationResult {
  lat: number;
  lng: number;
  address?: string;
  source: 'gps' | 'ip' | 'default';
  accuracy?: number;
}

export const reverseGeocodeCoord = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const main = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || "";
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";
      const display = [main, city, state].filter(Boolean).join(", ");
      return display || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    console.warn("Reverse geocode failed, using coordinates", err);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export const fetchIPLocation = async (): Promise<LocationResult> => {
  // Strategy 1: ipwhois.app
  try {
    const res = await fetch('https://ipwhois.app/json/');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      const city = data.city || '';
      const region = data.region || '';
      const country = data.country || '';
      const address = [city, region, country].filter(Boolean).join(', ') || 'Network Location';
      return { lat, lng, address, source: 'ip' };
    }
  } catch (err) {
    console.warn("IP Geolocation provider 1 failed:", err);
  }

  // Strategy 2: bigdatacloud client geocode
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      const city = data.city || data.locality || '';
      const region = data.principalSubdivision || '';
      const address = [city, region].filter(Boolean).join(', ') || 'Network Location';
      return { lat, lng, address, source: 'ip' };
    }
  } catch (err) {
    console.warn("IP Geolocation provider 2 failed:", err);
  }

  // Fallback default: New Delhi / Central India
  return {
    lat: 28.6139,
    lng: 77.2090,
    address: 'New Delhi, India (Default)',
    source: 'default'
  };
};

/**
 * Directly invokes browser native Location Permission Dialog:
 * - "Allow"
 * - "Allow this time" / "Allow for only now"
 * - "Don't allow"
 */
export const getBestLocation = (timeoutMs = 15000): Promise<LocationResult> => {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      fetchIPLocation().then(resolve);
      return;
    }

    let hasResolved = false;

    // Timeout fallback trigger if browser/GPS does not answer in timeoutMs
    const timeoutId = setTimeout(async () => {
      if (!hasResolved) {
        hasResolved = true;
        console.warn("Browser GPS timed out, falling back to network IP location...");
        const ipLoc = await fetchIPLocation();
        resolve(ipLoc);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutId);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const address = await reverseGeocodeCoord(lat, lng);
          resolve({ lat, lng, address, source: 'gps', accuracy });
        }
      },
      async (err) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutId);
          console.warn(`Browser location error (Code: ${err.code}): ${err.message}`);
          
          if (err.code === 1) {
            // User selected "Don't allow" / "Block"
            const ipLoc = await fetchIPLocation();
            resolve({ ...ipLoc, source: 'default' });
          } else {
            // Unavailable or timeout -> use network fallback
            const ipLoc = await fetchIPLocation();
            resolve(ipLoc);
          }
        }
      },
      {
        enableHighAccuracy: true, // Forces precise GPS / hardware location prompt
        timeout: timeoutMs,
        maximumAge: 0 // Forces fresh browser permission popup on each session
      }
    );
  });
};
