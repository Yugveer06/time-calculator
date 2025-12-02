import React, { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faMoneyBill,
	faPhone,
	faMapMarkerAlt,
	faTemperatureHigh,
	faSpinner,
	faInfoCircle,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/TimezoneAdditionalInfo.scss";

// Simple in-memory cache with timestamps
const weatherCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let lastApiCall = 0;
const MIN_API_INTERVAL = 2000; // 2 seconds between API calls (rate limiting)

const TimezoneAdditionalInfo = ({ addedTimeZone }) => {
	const [temperature, setTemperature] = useState(null);
	const [weatherLoading, setWeatherLoading] = useState(false);
	const [weatherError, setWeatherError] = useState(false);
	const [open, setOpen] = useState(false);

	// Extract country data
	const countryData = addedTimeZone;
	const hasStates = countryData.states && countryData.states.length > 0;
	const hasCities =
		hasStates &&
		countryData.states[0].cities &&
		countryData.states[0].cities.length > 0;

	// Get latitude and longitude
	let latitude, longitude;
	if (hasCities) {
		latitude = countryData.states[0].cities[0].latitude;
		longitude = countryData.states[0].cities[0].longitude;
	} else if (hasStates) {
		latitude = countryData.states[0].latitude;
		longitude = countryData.states[0].longitude;
	} else {
		latitude = countryData.latitude;
		longitude = countryData.longitude;
	}

	// Get currency info (with both code and name)
	const currencyCode = countryData.currency;
	const currencyName = countryData.currency_name;
	const currencySymbol = countryData.currency_symbol;

	// Get phone code
	const phoneCode = countryData.phone_code;

	// Fetch weather data with rate limiting - only when popover is open
	useEffect(() => {
		if (!latitude || !longitude || !open) return;

		const cacheKey = `${latitude},${longitude}`;

		// Check cache first
		const cached = weatherCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			setTemperature(cached.temp);
			setWeatherError(false);
			return;
		}

		const fetchWeather = async () => {
			const now = Date.now();
			const timeSinceLastCall = now - lastApiCall;

			// Rate limiting: wait if necessary
			if (timeSinceLastCall < MIN_API_INTERVAL) {
				const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}

			setWeatherLoading(true);
			setWeatherError(false);

			try {
				const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
				if (!apiKey) {
					console.warn("OpenWeather API key not found");
					setWeatherError(true);
					setWeatherLoading(false);
					return;
				}

				lastApiCall = Date.now();

				const response = await fetch(
					`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				const temp = Math.round(data.main.temp);

				// Update cache
				weatherCache.set(cacheKey, {
					temp,
					timestamp: Date.now(),
				});

				setTemperature(temp);
				setWeatherError(false);
			} catch (error) {
				console.error("Error fetching weather:", error);
				setWeatherError(true);
			} finally {
				setWeatherLoading(false);
			}
		};

		fetchWeather();
	}, [latitude, longitude, open]);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button className='infoButton' title='View location details'>
					<FontAwesomeIcon icon={faInfoCircle} />
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content className='InfoPopoverContent' sideOffset={5}>
					<div className='InfoPopoverHeader'>
						<h3>Location Details</h3>
						<Popover.Close
							className='InfoPopoverClose'
							aria-label='Close'
						>
							<FontAwesomeIcon icon={faXmark} />
						</Popover.Close>
					</div>
					<div className='InfoPopoverBody'>
						<div className='info-grid'>
							{/* Currency Info */}
							{currencyName && (
								<div className='info-item'>
									<div className='info-icon'>
										<FontAwesomeIcon icon={faMoneyBill} />
									</div>
									<div className='info-content'>
										<span className='info-label'>
											Currency
										</span>
										<span className='info-value'>
											{currencyCode &&
												`${currencyCode} - `}
											{currencySymbol} {currencyName}
										</span>
									</div>
								</div>
							)}

							{/* Phone Code */}
							{phoneCode && (
								<div className='info-item'>
									<div className='info-icon'>
										<FontAwesomeIcon icon={faPhone} />
									</div>
									<div className='info-content'>
										<span className='info-label'>
											Phone Code
										</span>
										<span className='info-value'>
											+{phoneCode}
										</span>
									</div>
								</div>
							)}

							{/* Coordinates */}
							{latitude && longitude && (
								<div className='info-item'>
									<div className='info-icon'>
										<FontAwesomeIcon
											icon={faMapMarkerAlt}
										/>
									</div>
									<div className='info-content'>
										<span className='info-label'>
											Coordinates
										</span>
										<span
											className='info-value'
											title={`${latitude}, ${longitude}`}
										>
											{parseFloat(latitude).toFixed(2)}°,{" "}
											{parseFloat(longitude).toFixed(2)}°
										</span>
									</div>
								</div>
							)}

							{/* Temperature */}
							{latitude && longitude && (
								<div className='info-item'>
									<div className='info-icon'>
										<FontAwesomeIcon
											icon={
												weatherLoading
													? faSpinner
													: faTemperatureHigh
											}
											spin={weatherLoading}
										/>
									</div>
									<div className='info-content'>
										<span className='info-label'>
											Temperature
										</span>
										<span className='info-value'>
											{weatherLoading
												? "Loading..."
												: weatherError
												? "N/A"
												: temperature !== null
												? `${temperature}°C`
												: "N/A"}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
					<Popover.Arrow className='InfoPopoverArrow' />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default TimezoneAdditionalInfo;
