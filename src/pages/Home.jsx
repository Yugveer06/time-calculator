import React, { useEffect, useRef, useState } from "react";
import "../styles/Home.scss";

import { motion as m } from "framer-motion";

import Navbar from "../components/Navbar";
import AddedTimeZonesList from "../components/AddedTimeZonesList";
import TimeZoneSearchPopover from "../components/TimeZoneSearchPopover";
import TimeOffsetControls from "../components/TimeOffsetControls";

import { getTimeZones } from "@vvo/tzdb";
import useLocalStorage from "../hooks/useLocalStorage";
import data from "../countries+states+cities.json";

import Geonames from "geonames.js";

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

	useEffect(() => {
		document.body.setAttribute("data-theme", userSettings.theme);
	}, [userSettings.theme]);

	const [popOverOpened, setPopOverOpened] = useState(false);
	const [isFetchingTimeZone, setIsFetchingTimeZone] = useState(false);

	const geonames = Geonames({
		username: GEONAMES_USERNAME,
		lan: "en",
		encoding: "JSON",
	});

	const debounceTimeout = useRef();

	function handleSearchInput(searchQuery) {
		setSearchTerm(searchQuery);

		clearTimeout(debounceTimeout.current);
		if (searchQuery !== "") {
			debounceTimeout.current = setTimeout(() => {
				setSearchResults(searchLocation(data, searchQuery));
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
				});
			} else if (country.name.toLowerCase().includes(lowerCaseQuery)) {
				partialMatches.push({
					name: country.name,
					latitude: country.latitude,
					longitude: country.longitude,
				});
			} else {
				country.states.forEach(state => {
					if (state.name.toLowerCase() === lowerCaseQuery) {
						exactMatches.push({
							name: country.name,
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

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", userSettings.theme);
	}, [userSettings.theme]);

	return (
		<div className='wrapper'>
			<Navbar
				hourFormat={hourFormat}
				setHourFormat={setHourFormat}
				userSettings={userSettings}
				setUserSettings={setUserSettings}
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
