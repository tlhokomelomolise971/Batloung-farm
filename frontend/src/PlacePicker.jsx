import { useEffect, useId, useRef, useState } from 'react';
import { PROVINCES } from './api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const PROVINCE_BOUNDS = { north: -22, south: -34.9, west: 16.4, east: 33 };
const EXCLUDED_SA_PROVINCES = ['Northern Cape'];
let mapsPromise;

function isSupportedPlace(place) {
  const components = place.addressComponents || place.address_components || [];
  const countryComponent = components.find((component) => component.types.includes('country'));
  const country = (countryComponent?.shortText || countryComponent?.short_name || '').toLowerCase();
  if (country === 'ls') return true;
  if (country !== 'za') return false;
  const provinceComponent = components.find((component) => component.types.includes('administrative_area_level_1'));
  const province = provinceComponent?.longText || provinceComponent?.long_name;
  return PROVINCES.includes(province);
}

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const callbackName = '__batloungGoogleMapsReady';
      const script = document.createElement('script');
      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };
      script.dataset.googleMaps = 'true';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&loading=async&v=weekly&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => {
        delete window[callbackName];
        mapsPromise = null;
        reject(new Error('Google Maps could not be loaded. Check the API key and enabled APIs.'));
      };
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

function getCoordinates(value) {
  if (value.latitude === null || value.latitude === undefined || value.longitude === null || value.longitude === undefined) {
    return null;
  }
  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export default function PlacePicker({ label, value, onChange, required = false, placeholder, focusLocation }) {
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const placesLibraryRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const requestIdRef = useRef(0);
  const inputId = useId();
  const suggestionsId = `place-suggestions-${useId()}`;
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const coordinates = getCoordinates(value);

  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return undefined;
    let active = true;
    let mapListener;

    loadGoogleMaps()
      .then(async (maps) => {
        const placesLibrary = await maps.importLibrary('places');
        if (!active || !mapRef.current) return;
        const selectedPosition = getCoordinates(valueRef.current);
        const map = new maps.Map(mapRef.current, {
          center: selectedPosition || { lat: -28.5, lng: 24.5 },
          zoom: selectedPosition ? 15 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        if (!selectedPosition) map.fitBounds(PROVINCE_BOUNDS);
        const marker = new maps.Marker({ map, position: getCoordinates(valueRef.current) || null });
        const geocoder = new maps.Geocoder();
        mapInstanceRef.current = map;
        markerRef.current = marker;
        placesLibraryRef.current = placesLibrary;
        setMapReady(true);

        mapListener = map.addListener('click', ({ latLng }) => {
          if (!latLng) return;
          const lat = latLng.lat();
          const lng = latLng.lng();
          geocoder.geocode({ location: latLng })
            .then(({ results }) => {
              const place = results.find(isSupportedPlace);
              if (!place) {
                setMapError('Choose a location in Lesotho or one of the supported South African provinces.');
                return;
              }
              const address = place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              setMapError('');
              onChangeRef.current({ address, latitude: lat, longitude: lng });
            })
            .catch((error) => {
              setMapError(error.message || 'Could not verify the province for that pin.');
            });
        });
      })
      .catch((error) => {
        if (active) setMapError(error.message);
      });

    return () => {
      active = false;
      mapListener?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      placesLibraryRef.current = null;
    };
  }, []);

  async function searchPlaces(query) {
    const requestId = ++requestIdRef.current;
    setSuggestions([]);
    setActiveSuggestion(-1);
    if (query.trim().length < 2 || !placesLibraryRef.current) return;

    try {
      const placesLibrary = placesLibraryRef.current;
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
      }
      const { suggestions: placeSuggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedRegionCodes: ['za', 'ls'],
        locationRestriction: PROVINCE_BOUNDS,
        sessionToken: sessionTokenRef.current,
      });
      if (requestId === requestIdRef.current) {
        setSuggestions(
          placeSuggestions
            .map((item) => item.placePrediction)
            .filter(Boolean)
            .filter((prediction) => !EXCLUDED_SA_PROVINCES.some((province) => (
              prediction.text.toString().toLowerCase().includes(province.toLowerCase())
            ))),
        );
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setMapError(error.message || 'Place search failed.');
      }
    }
  }

  async function selectSuggestion(prediction) {
    const requestId = ++requestIdRef.current;
    setSuggestions([]);
    setActiveSuggestion(-1);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'location', 'displayName'],
      });
      if (requestId !== requestIdRef.current) return;
      sessionTokenRef.current = null;
      if (!isSupportedPlace(place)) {
        setMapError('Choose a place in Lesotho or one of the supported South African provinces.');
        return;
      }
      if (!place.location) {
        setMapError('Select a suggested place with a map location.');
        return;
      }
      const lat = place.location.lat();
      const lng = place.location.lng();
      const address = place.formattedAddress || place.displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setMapError('');
      onChangeRef.current({ address, latitude: lat, longitude: lng });
      mapInstanceRef.current?.setCenter({ lat, lng });
      mapInstanceRef.current?.setZoom(15);
      markerRef.current?.setPosition({ lat, lng });
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setMapError(error.message || 'Could not load details for this place.');
      }
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === 'Escape') {
      setSuggestions([]);
      setActiveSuggestion(-1);
    }
  }

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markerRef.current) return;
    if (!coordinates) {
      markerRef.current.setMap(null);
      return;
    }
    markerRef.current.setMap(mapInstanceRef.current);
    markerRef.current.setPosition(coordinates);
    mapInstanceRef.current.panTo(coordinates);
    mapInstanceRef.current.setZoom(15);
  }, [mapReady, value.latitude, value.longitude]);

  useEffect(() => {
    if (!focusLocation || !mapReady || !mapInstanceRef.current || !markerRef.current) return undefined;
    let active = true;
    const map = mapInstanceRef.current;
    const marker = markerRef.current;

    async function showLocation() {
      setMapError('');
      marker.setMap(null);
      const savedCoordinates = getCoordinates(focusLocation);
      if (savedCoordinates) {
        marker.setMap(map);
        marker.setPosition(savedCoordinates);
        map.setCenter(savedCoordinates);
        map.setZoom(15);
        return;
      }

      const address = focusLocation.province
        ? `${focusLocation.address}, ${focusLocation.province}, South Africa`
        : focusLocation.address;
      if (!address) {
        setMapError('This record has no saved address or coordinates to show on the map.');
        return;
      }

      const placesLibrary = placesLibraryRef.current;
      if (!placesLibrary) {
        setMapError('Place search is not available. Check the Google Places API configuration.');
        return;
      }
      const sessionToken = new placesLibrary.AutocompleteSessionToken();
      const { suggestions: placeSuggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: address,
        includedRegionCodes: ['za', 'ls'],
        locationRestriction: PROVINCE_BOUNDS,
        sessionToken,
      });
      const prediction = placeSuggestions.find((item) => item.placePrediction)?.placePrediction;
      if (!prediction) {
        if (active) setMapError(`No map location was found for "${focusLocation.address}".`);
        return;
      }
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'location', 'displayName'],
      });
      if (!active) return;
      if (!isSupportedPlace(place) || !place.location) {
        setMapError('This record could not be located in Lesotho or one of the supported South African provinces.');
        return;
      }

      const coordinates = { lat: place.location.lat(), lng: place.location.lng() };
      marker.setMap(map);
      marker.setPosition(coordinates);
      map.setCenter(coordinates);
      map.setZoom(15);
    }

    showLocation().catch((error) => {
      if (active) setMapError(error.message || 'Could not find this record on the map.');
    });

    return () => {
      active = false;
    };
  }, [focusLocation, mapReady]);

  return (
    <div className="place-picker">
      <div className="place-search">
        <label htmlFor={inputId}>
          {label}
          <input
            ref={inputRef}
            id={inputId}
            value={value.address}
            onChange={(event) => {
              const address = event.target.value;
              onChange({ address, latitude: null, longitude: null });
              setMapError('');
              searchPlaces(address);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder || 'Search for a place or enter an address'}
            required={required}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={suggestionsId}
            aria-activedescendant={activeSuggestion >= 0 ? `${suggestionsId}-${activeSuggestion}` : undefined}
          />
        </label>
        {suggestions.length > 0 && (
          <div id={suggestionsId} className="place-suggestions" role="listbox" aria-label="Place suggestions">
            {suggestions.map((prediction, index) => (
              <button
                id={`${suggestionsId}-${index}`}
                key={prediction.placeId}
                type="button"
                role="option"
                aria-selected={activeSuggestion === index}
                className={activeSuggestion === index ? 'active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(prediction)}
              >
                {prediction.text.toString()}
              </button>
            ))}
          </div>
        )}
      </div>
      {GOOGLE_MAPS_API_KEY ? (
        <>
          <div className="place-map" ref={mapRef} role="application" aria-label={`${label} map`} />
          <p className="muted place-help">
            Search and choose a suggested place, or click the map to drop a pin.
            {coordinates && ` Pin: ${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`}
          </p>
          {mapError && <p className="msg err place-error" role="status">{mapError}</p>}
        </>
      ) : (
        <p className="muted place-help">
          Map selection is unavailable. Configure VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.
        </p>
      )}
    </div>
  );
}
