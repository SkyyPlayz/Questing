const DEFAULT_LOCATION = { lat: 43.0731, lng: -104.1458 };
const DEFAULT_RADIUS_KM = 25;

function parseFiniteNumber(value) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validationError(message, field) {
  return {
    ok: false,
    error: "Invalid map query parameters",
    message,
    field,
  };
}

export function parseJobMapQuery(searchParams) {
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");
  const hasLat = latParam != null;
  const hasLng = lngParam != null;

  if (hasLat !== hasLng) {
    return validationError("lat and lng must be provided together", hasLat ? "lng" : "lat");
  }

  let lat = DEFAULT_LOCATION.lat;
  let lng = DEFAULT_LOCATION.lng;

  if (hasLat && hasLng) {
    lat = parseFiniteNumber(latParam);
    if (lat == null || lat < -90 || lat > 90) {
      return validationError("lat must be a number between -90 and 90", "lat");
    }

    lng = parseFiniteNumber(lngParam);
    if (lng == null || lng < -180 || lng > 180) {
      return validationError("lng must be a number between -180 and 180", "lng");
    }
  }

  let radius = DEFAULT_RADIUS_KM;
  if (radiusParam != null) {
    radius = parseFiniteNumber(radiusParam);
    if (radius == null || radius < 0) {
      return validationError("radius must be a non-negative number in kilometers", "radius");
    }
  }

  return { ok: true, value: { lat, lng, radius } };
}
