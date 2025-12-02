import { useEffect, useRef, useState } from "react";
import "../styles/Home.scss";

import { motion as m } from "framer-motion";

import AddedTimeZonesList from "../components/AddedTimeZonesList";
import Navbar from "../components/Navbar";
import TimeOffsetControls from "../components/TimeOffsetControls";
import TimeZoneSearchPopover from "../components/TimeZoneSearchPopover";

import { getTimeZones } from "@vvo/tzdb";
import useLocalStorage from "../hooks/useLocalStorage";
// import data from "../countries+states+cities.json"; // Removed static import

import Geonames from "geonames.js";
import moment from "moment-timezone";

const Home = () => {
	const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const GEONAMES_USERNAME = import.meta.env.VITE_GEONAMES_USERNAME;

	const [spinnerText, setSpinnerText] = useState("library");
	const [userSettings, setUserSettings] = useLocalStorage(
		"timeCalculatorSettings",
		{
			theme: "light",
			addedTimeZones: [],
			hourFormat: 12,
			offsetTimeBy: { hours: 0, minutes: 0, seconds: 0, sign: 1 },
		}
	);
	const [hourFormat, setHourFormat] = useState(userSettings.hourFormat);
	const [addedTimeZones, setAddedTimeZones] = useState(
		userSettings.addedTimeZones
	);
	const [offsetTimeBy, setOffsetTimeBy] = useState(userSettings.offsetTimeBy);

	const timeZones = getTimeZones();
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState([]);

	// State moved from AddedTimeZonesList
	const [date, setDate] = useState(new Date());
	const [globalTimeOverride, setGlobalTimeOverride] = useState(null);
	const [systemTimezoneData, setSystemTimezoneData] = useState(null);

	// Load system timezone data based on currentTimeZone
	useEffect(() => {
		const loadSystemTimezoneData = async () => {
			try {
				const module = await import("../countries+states+cities.json");
				const data = module.default;

				// Handle legacy timezone names
				let targetTimezone = currentTimeZone;
				if (currentTimeZone === "Asia/Calcutta") {
					targetTimezone = "Asia/Kolkata";
				}

				// Find the country/city that matches the system timezone
				for (const country of data) {
					// Check country-level timezone
					if (country.timezones) {
						for (const tz of country.timezones) {
							if (tz.zoneName === targetTimezone) {
								setSystemTimezoneData({
									name: country.name,
									latitude: country.latitude,
									longitude: country.longitude,
									currency: country.currency,
									currency_name: country.currency_name,
									currency_symbol: country.currency_symbol,
									phone_code: country.phone_code,
									timezone: targetTimezone,
								});
								return;
							}
						}
					}
				}
			} catch (error) {
				console.error("Error loading system timezone data:", error);
			}
		};

		loadSystemTimezoneData();
	}, [currentTimeZone]);

	useEffect(() => {
		document.body.setAttribute("data-theme", userSettings.theme);
	}, [userSettings.theme]);

	// Load saved custom time on mount
	useEffect(() => {
		const savedTime = localStorage.getItem("globalTimeOverride");
		if (savedTime) {
			const parsedDate = new Date(savedTime);
			if (!isNaN(parsedDate.getTime())) {
				setGlobalTimeOverride(parsedDate);
				setDate(parsedDate);
			}
		}
	}, []);

	// Save custom time to localStorage and update theme
	useEffect(() => {
		if (globalTimeOverride) {
			localStorage.setItem(
				"globalTimeOverride",
				globalTimeOverride.toISOString()
			);
			document.body.setAttribute("data-mode", "custom-time");
		} else {
			localStorage.removeItem("globalTimeOverride");
			document.body.removeAttribute("data-mode");
		}
	}, [globalTimeOverride]);

	useEffect(() => {
		var timerID = setInterval(() => tick(), 1000);
		return function cleanup() {
			clearInterval(timerID);
		};
	});

	function tick() {
		// Only update date if we're not using a custom time override
		if (!globalTimeOverride) {
			setDate(new Date());
		}
	}

	const handleGlobalTimeChange = (newDate, sourceTimezone) => {
		if (newDate === null) {
			// Reset to real-time
			setGlobalTimeOverride(null);
			setDate(new Date());
		} else {
			// newDate is the "face value" time set by the user.
			// We need to interpret this face value as being in the sourceTimezone
			// and convert it to an absolute timestamp.

			// Format the date components to a string that moment can parse
			// We use local getters because newDate is a local Date object constructed from inputs
			const year = newDate.getFullYear();
			const month = String(newDate.getMonth() + 1).padStart(2, "0");
			const day = String(newDate.getDate()).padStart(2, "0");
			const hours = String(newDate.getHours()).padStart(2, "0");
			const minutes = String(newDate.getMinutes()).padStart(2, "0");
			const seconds = String(newDate.getSeconds()).padStart(2, "0");

			const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

			// Create absolute date from the source timezone
			const absoluteDate = moment.tz(timeString, sourceTimezone).toDate();

			setGlobalTimeOverride(absoluteDate);
			setDate(absoluteDate);
		}
	};

	const [popOverOpened, setPopOverOpened] = useState(false);
	const [isFetchingTimeZone, setIsFetchingTimeZone] = useState(false);

	const geonames = Geonames({
		username: GEONAMES_USERNAME,
		lan: "en",
		encoding: "JSON",
	});

	const debounceTimeout = useRef();
	const citiesData = useRef(null);

	// Preload data when popover opens
	useEffect(() => {
		if (popOverOpened && !citiesData.current) {
			import("../countries+states+cities.json").then(module => {
				citiesData.current = module.default;
			});
		}
	}, [popOverOpened]);

	async function handleSearchInput(searchQuery) {
		setSearchTerm(searchQuery);

		clearTimeout(debounceTimeout.current);
		if (searchQuery !== "") {
			// Ensure data is loaded
			if (!citiesData.current) {
				try {
					const module = await import(
						"../countries+states+cities.json"
					);
					citiesData.current = module.default;
				} catch (error) {
					console.error("Failed to load cities data", error);
					return;
				}
			}

			debounceTimeout.current = setTimeout(() => {
				setSearchResults(
					searchLocation(citiesData.current, searchQuery)
				);
			}, 500);
		} else {
			setSearchResults([]);
		}
	}

	const cache = useRef({});

	function searchLocation(data, query) {
		if (cache.current[query]) {
			return cache.current[query];
		}

		let exactMatches = [];
		let partialMatches = [];
		let lowerCaseQuery = query.toLowerCase();
		data.forEach(country => {
			if (country.name.toLowerCase() === lowerCaseQuery) {
				exactMatches.push({
					name: country.name,
					latitude: country.latitude,
					longitude: country.longitude,
					currency: country.currency,
					currency_name: country.currency_name,
					currency_symbol: country.currency_symbol,
					phone_code: country.phone_code,
				});
			} else if (country.name.toLowerCase().includes(lowerCaseQuery)) {
				partialMatches.push({
					name: country.name,
					latitude: country.latitude,
					longitude: country.longitude,
					currency: country.currency,
					currency_name: country.currency_name,
					currency_symbol: country.currency_symbol,
					phone_code: country.phone_code,
				});
			} else {
				country.states.forEach(state => {
					if (state.name.toLowerCase() === lowerCaseQuery) {
						exactMatches.push({
							name: country.name,
							currency: country.currency,
							currency_name: country.currency_name,
							currency_symbol: country.currency_symbol,
							phone_code: country.phone_code,
							states: [
								{
									name: state.name,
									latitude: state.latitude,
									longitude: state.longitude,
								},
							],
						});
					} else if (
						state.name.toLowerCase().includes(lowerCaseQuery)
					) {
						partialMatches.push({
							name: country.name,
							currency: country.currency,
							currency_name: country.currency_name,
							currency_symbol: country.currency_symbol,
							phone_code: country.phone_code,
							states: [
								{
									name: state.name,
									latitude: state.latitude,
									longitude: state.longitude,
								},
							],
						});
					} else {
						state.cities.forEach(city => {
							if (city.name.toLowerCase() === lowerCaseQuery) {
								exactMatches.push({
									name: country.name,
									currency: country.currency,
									currency_name: country.currency_name,
									currency_symbol: country.currency_symbol,
									phone_code: country.phone_code,
									states: [
										{
											name: state.name,
											cities: [
												{
													name: city.name,
													latitude: city.latitude,
													longitude: city.longitude,
												},
											],
										},
									],
								});
							} else if (
								city.name.toLowerCase().includes(lowerCaseQuery)
							) {
								partialMatches.push({
									name: country.name,
									currency: country.currency,
									currency_name: country.currency_name,
									currency_symbol: country.currency_symbol,
									phone_code: country.phone_code,
									states: [
										{
											name: state.name,
											cities: [
												{
													name: city.name,
													latitude: city.latitude,
													longitude: city.longitude,
												},
											],
										},
									],
								});
							}
						});
					}
				});
			}
		});

		const results = [...exactMatches, ...partialMatches];
		cache.current[query] = results;
		return results;
	}

	async function handleResultClick(result) {
		// Fetch the timezone for the clicked result if it doesnt already exist
		if (
			!addedTimeZones.some(addedTimeZone => {
				const {
					["timezone"]: removedAddedTimeZone,
					...restAddedTimeZone
				} = addedTimeZone;
				const { ["timezone"]: removedResult, ...restResult } = result;
				return (
					JSON.stringify(restAddedTimeZone) ===
					JSON.stringify(restResult)
				);
			})
		) {
			setIsFetchingTimeZone(true);
			let latitude, longitude;
			if (result.states) {
				let state = result.states[0];
				if (state.cities) {
					let city = state.cities[0];
					if (city.latitude && city.longitude) {
						latitude = city.latitude;
						longitude = city.longitude;
					}
				}
				if (!latitude && state.latitude && state.longitude) {
					latitude = state.latitude;
					longitude = state.longitude;
				}
			}
			if (!latitude && result.latitude && result.longitude) {
				latitude = result.latitude;
				longitude = result.longitude;
			}

			// If the timezone is not already added, add it
			if (latitude && longitude) {
				try {
					console.log("fetching from library");
					setSpinnerText("Getting Timezone");
					const data = await geonames.timezone({
						lat: latitude,
						lng: longitude,
					});
					result.timezone = data.timezoneId;
				} catch (libraryError) {
					try {
						console.log("fetching from API");
						setSpinnerText("Trying to get the timezone...");
						const api = `http://api.geonames.org/timezoneJSON?username=${GEONAMES_USERNAME}&lang=en&lat=${latitude}&lng=${longitude}`;

						const response = await fetch(api);
						const data = await response.json();

						result.timezone = data.timezoneId;
					} catch (apiError) {
						setSpinnerText("Error");
						return;
					}
				}

				setIsFetchingTimeZone(false);
			}

			setAddedTimeZones(prev => [...prev, result]);
			setUserSettings({
				...userSettings,
				addedTimeZones: [...addedTimeZones, result],
			});
		}

		setSearchResults([]);
	}

	return (
		<div className='wrapper'>
			<Navbar
				hourFormat={hourFormat}
				setHourFormat={setHourFormat}
				userSettings={userSettings}
				setUserSettings={setUserSettings}
				isCustomTime={globalTimeOverride !== null}
			/>
			<main>
				<AddedTimeZonesList
					userSettings={userSettings}
					setUserSettings={setUserSettings}
					currentTimeZone={currentTimeZone}
					hourFormat={hourFormat}
					offsetTimeBy={offsetTimeBy}
					addedTimeZones={addedTimeZones}
					setAddedTimeZones={setAddedTimeZones}
					isFetchingTimeZone={isFetchingTimeZone}
					spinnerText={spinnerText}
					date={date}
					globalTimeOverride={globalTimeOverride}
					handleGlobalTimeChange={handleGlobalTimeChange}
					systemTimezoneData={systemTimezoneData}
				/>
				<m.div className='addTimeZone'>
					<TimeZoneSearchPopover
						popOverOpened={popOverOpened}
						setPopOverOpened={setPopOverOpened}
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						handleSearchInput={handleSearchInput}
						searchResults={searchResults}
						handleResultClick={handleResultClick}
					/>
				</m.div>
				<TimeOffsetControls
					userSettings={userSettings}
					setUserSettings={setUserSettings}
					offsetTimeBy={offsetTimeBy}
					setOffsetTimeBy={setOffsetTimeBy}
				/>
			</main>
		</div>
	);
};

export default Home;
