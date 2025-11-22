import React, { useEffect, useRef, useState } from "react";
import "../styles/Home.scss";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faArrowRotateLeft,
	faCheck,
	faChevronDown,
	faChevronUp,
	faClose,
	faXmark,
	faCircleNotch,
	faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import { AnimatePresence, Reorder, motion as m } from "framer-motion";
import moment from "moment-timezone";

import Navbar from "../components/Navbar";
import * as Popover from "@radix-ui/react-popover";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Select from "@radix-ui/react-select";
import * as Tooltip from "@radix-ui/react-tooltip";

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
					} else if (state.name.toLowerCase().includes(lowerCaseQuery)) {
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
							} else if (city.name.toLowerCase().includes(lowerCaseQuery)) {
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
				const { ["timezone"]: removedAddedTimeZone, ...restAddedTimeZone } =
					addedTimeZone;
				const { ["timezone"]: removedResult, ...restResult } = result;
				return JSON.stringify(restAddedTimeZone) === JSON.stringify(restResult);
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
					<Popover.Root onOpenChange={setPopOverOpened} open={popOverOpened}>
						<Popover.Trigger asChild>
							<m.button
								layout
								className='addTimeZoneButton'
								aria-label='Add Time Zone'
							>
								Add Time Zone
							</m.button>
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content className='PopoverContent' sideOffset={5}>
								<div className='PopoverHeader'>
									<h2>Choose Time Zone</h2>
									<div className='searchArea'>
										<div className='inputArea'>
											<input
												type='text'
												className='timeZoneSearchBar'
												value={searchTerm}
												onChange={event =>
													handleSearchInput(event.target.value)
												}
												placeholder='Search...'
											/>
											{searchTerm !== "" && (
												<m.button
													className='clearSearchQuery'
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													onClick={() => {
														setSearchTerm("");
														handleSearchInput("");
													}}
												>
													<FontAwesomeIcon icon={faClose} />
												</m.button>
											)}
										</div>
										<div className='resultsFound'>
											{searchTerm !== "" &&
												searchResults.length + " results found..."}
										</div>
									</div>
								</div>
								<ScrollArea.Root className='ScrollAreaRoot'>
									<ScrollArea.Viewport className='ScrollAreaViewport'>
										<div className='timeZonesList'>
											{searchResults?.map((result, index) => {
												let isCity = false;
												let isState = false;
												let isCountry = false;
												if (result.name) {
													isCountry = true;
												}
												if (result.states && result.states[0].name) {
													isState = true;
												}
												if (
													result.states &&
													result.states[0].cities &&
													result.states[0].cities[0].name
												) {
													isCity = true;
												}
												return (
													<button
														className='searchTimeZone'
														onClick={() => {
															handleResultClick(result);
															setSearchTerm("");
															setPopOverOpened(false);
														}}
														key={index}
													>
														<div className='left'>
															<div className='name 1'>
																{isCity
																	? result.states[0].cities[0].name
																	: isState
																	? result.states[0].name
																	: result.name}
															</div>
															<div className='name 2'>
																{isCity
																	? result.states[0].name + ", " + result.name
																	: isState
																	? result.name
																	: null}
															</div>
														</div>
														<div className='abbreviation'>{""}</div>
													</button>
												);
											})}
										</div>
									</ScrollArea.Viewport>
									<ScrollArea.Scrollbar
										className='ScrollAreaScrollbar'
										orientation='vertical'
									>
										<ScrollArea.Thumb className='ScrollAreaThumb' />
									</ScrollArea.Scrollbar>
									<ScrollArea.Scrollbar
										className='ScrollAreaScrollbar'
										orientation='horizontal'
									>
										<ScrollArea.Thumb className='ScrollAreaThumb' />
									</ScrollArea.Scrollbar>
									<ScrollArea.Corner className='ScrollAreaCorner' />
								</ScrollArea.Root>
								<Popover.Close className='PopoverClose' aria-label='Close'>
									<FontAwesomeIcon icon={faClose} />
								</Popover.Close>
								<Popover.Arrow className='PopoverArrow' />
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</m.div>
				<m.div layout='position' className='offsetTime'>
					<div className='left'>
						<span>
							What {offsetTimeBy.sign === 1 ? "will be" : "was"} the time
						</span>
						<SelectMenu
							userSettings={userSettings}
							setUserSettings={setUserSettings}
							Items={["after", "before"]}
							offsetTimeBy={offsetTimeBy}
							setOffsetTimeBy={setOffsetTimeBy}
						/>
						<div className='offsetTimeInputGroup hours'>
							<m.input
								type='number'
								className='offsetTimeInput'
								min={0}
								// max={2399529252}
								value={offsetTimeBy.hours.toString()}
								onFocus={e => e.target.select()}
								onChange={e => {
									setOffsetTimeBy(prev => ({
										...prev,
										hours: Number(e.target.value),
									}));
									setUserSettings({
										...userSettings,
										offsetTimeBy: {
											...offsetTimeBy,
											hours: Number(e.target.value),
										},
									});
								}}
								animate={{
									width: `${offsetTimeBy.hours.toString().length + 1 + 4}ch`,
								}}
							/>
							<span>hour{offsetTimeBy.hours !== 1 ? "s" : ""}</span>
						</div>
						<div className='offsetTimeInputGroup minutes'>
							<m.input
								type='number'
								className='offsetTimeInput'
								min={0}
								// max={143971755138}
								value={offsetTimeBy.minutes.toString()}
								onFocus={e => e.target.select()}
								onChange={e => {
									setOffsetTimeBy(prev => ({
										...prev,
										minutes: Number(e.target.value),
									}));
									setUserSettings({
										...userSettings,
										offsetTimeBy: {
											...offsetTimeBy,
											minutes: Number(e.target.value),
										},
									});
								}}
								animate={{
									width: `${offsetTimeBy.minutes.toString().length + 1 + 4}ch`,
								}}
							/>
							<span>minute{offsetTimeBy.minutes !== 1 ? "s" : ""}</span>
						</div>
						<div className='offsetTimeInputGroup seconds'>
							<m.input
								type='number'
								className='offsetTimeInput'
								min={0}
								value={offsetTimeBy.seconds.toString()}
								onFocus={e => e.target.select()}
								onChange={e => {
									setOffsetTimeBy(prev => ({
										...prev,
										seconds: Number(e.target.value),
									}));
									setUserSettings({
										...userSettings,
										offsetTimeBy: {
											...offsetTimeBy,
											seconds: Number(e.target.value),
										},
									});
								}}
								animate={{
									width: `${offsetTimeBy.seconds.toString().length + 1 + 4}ch`,
								}}
							/>
							<span>second{offsetTimeBy.seconds !== 1 ? "s" : ""}?</span>
						</div>
					</div>
					<div className='right'>
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger asChild>
									<button
										className='resetOffsetButton'
										onClick={() => {
											setOffsetTimeBy({
												hours: 0,
												minutes: 0,
												seconds: 0,
												sign: 1,
											});
											setUserSettings({
												...userSettings,
												offsetTimeBy: {
													hours: 0,
													minutes: 0,
													seconds: 0,
													sign: 1,
												},
											});
										}}
									>
										<FontAwesomeIcon icon={faArrowRotateLeft} />
									</button>
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content className='TooltipContent' sideOffset={5}>
										Reset offset time settings
										<Tooltip.Arrow className='TooltipArrow' />
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						</Tooltip.Provider>
					</div>
				</m.div>
			</main>
		</div>
	);
};

const AddedTimeZonesList = ({
	userSettings,
	setUserSettings,
	currentTimeZone,
	hourFormat,
	offsetTimeBy,
	addedTimeZones,
	setAddedTimeZones,
	isFetchingTimeZone,
	spinnerText,
}) => {
	const [date, setDate] = useState(new Date());
	useEffect(() => {
		var timerID = setInterval(() => tick(), 1000);
		return function cleanup() {
			clearInterval(timerID);
		};
	});

	function tick() {
		setDate(
			new Date(),
			offsetTimeBy.hours,
			offsetTimeBy.minutes,
			offsetTimeBy.seconds
		);
	}

	function convertTimeZone(date, fromTimeZone, toTimeZone) {
		// Create a Date object for the given date and time in the fromTimeZone
		var fromTime = new Date(
			date.toLocaleString("en-US", { timeZone: fromTimeZone })
		);

		// Convert the date to the toTimeZone
		var toTime = new Date(
			fromTime.toLocaleString("en-US", { timeZone: toTimeZone })
		);

		return toTime;
	}

	function offsetTime(date, hours = 0, minutes = 0, seconds = 0) {
		let result = new Date(date.getTime());
		result.setHours(result.getHours() + hours * offsetTimeBy.sign);
		result.setMinutes(result.getMinutes() + minutes * offsetTimeBy.sign);
		result.setSeconds(result.getSeconds() + seconds * offsetTimeBy.sign);
		return result;
	}

	return (
		<div className='addedTimeZones'>
			<div className='default timezone'>
				<div className='top'>
					<div className='label'>System Clock</div>
				</div>
				<div className='bottom'>
					<div className='left'>
						<h2 className='timeZoneNameOfDefaultTimeZone'>{currentTimeZone}</h2>
						<div className='timeAndDate current'>
							<span className='label'>Current Time and Date: </span>
							<span className='time'>
								{date
									.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
										second: "2-digit",
										hour12: hourFormat === 12,
									})
									.replace(
										hourFormat === 12 ? /^00/ : /^24/,
										hourFormat === 12 ? "12" : "00"
									)}
							</span>
							<span className='date'>
								{", " +
									date.toLocaleDateString([], {
										weekday: "long",
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
							</span>
							<div className='timeline current'>
								<div className='line'>
									<div className='numbers'>
										{[...Array(25).keys()].map(e => {
											return (
												<span
													className={
														convertTimeZone(
															date,
															currentTimeZone,
															currentTimeZone
														).getHours() === e
															? "highlighted"
															: null
													}
													key={e}
												>
													{e}
												</span>
											);
										})}
									</div>
								</div>
								<m.div
									className='circle'
									animate={{
										width:
											((convertTimeZone(
												date,
												currentTimeZone,
												currentTimeZone
											) /
												1000 -
												convertTimeZone(
													date,
													currentTimeZone,
													currentTimeZone
												).setHours(0, 0, 0, 0) /
													1000) /
												(24 * 60 * 60)) *
												100 +
											"%",
									}}
								></m.div>
							</div>
						</div>
						<AnimatePresence mode='wait'>
							{offsetTimeBy.hours +
								offsetTimeBy.minutes +
								offsetTimeBy.seconds !==
								0 && (
								<m.div
									initial={{ opacity: 0, height: 0, marginTop: 0 }}
									animate={{ opacity: 1, height: "auto", marginTop: 16 }}
									exit={{ opacity: 0, height: 0, marginTop: 0 }}
									className='timeAndDate requested'
								>
									<span className='label'>Requested Time and Date: </span>
									<span className='time'>
										{offsetTime(
											date,
											offsetTimeBy.hours,
											offsetTimeBy.minutes,
											offsetTimeBy.seconds
										)
											.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
												hour12: hourFormat === 12,
											})
											.replace(
												hourFormat === 12 ? /^00/ : /^24/,
												hourFormat === 12 ? "12" : "00"
											)}
									</span>
									<span className='date'>
										{", " +
											offsetTime(
												date,
												offsetTimeBy.hours,
												offsetTimeBy.minutes,
												offsetTimeBy.seconds
											).toLocaleDateString([], {
												weekday: "long",
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
									</span>
									<div className='timeline requested'>
										<div className='line'>
											<div className='numbers'>
												{[...Array(25).keys()].map(e => {
													return (
														<span
															className={
																offsetTime(
																	convertTimeZone(
																		date,
																		currentTimeZone,
																		currentTimeZone
																	),
																	offsetTimeBy.hours,
																	offsetTimeBy.minutes,
																	offsetTimeBy.seconds
																).getHours() === e
																	? "highlighted"
																	: null
															}
															key={e}
														>
															{e}
														</span>
													);
												})}
											</div>
										</div>
										<m.div
											className='circle'
											animate={{
												width:
													((offsetTime(
														convertTimeZone(
															date,
															currentTimeZone,
															currentTimeZone
														),
														offsetTimeBy.hours,
														offsetTimeBy.minutes,
														offsetTimeBy.seconds
													) /
														1000 -
														offsetTime(
															convertTimeZone(
																date,
																currentTimeZone,
																currentTimeZone
															),
															offsetTimeBy.hours,
															offsetTimeBy.minutes,
															offsetTimeBy.seconds
														).setHours(0, 0, 0, 0) /
															1000) /
														(24 * 60 * 60)) *
														100 +
													"%",
											}}
										></m.div>
									</div>
								</m.div>
							)}
						</AnimatePresence>
					</div>
					<div className='right'></div>
				</div>
			</div>
			{addedTimeZones.length > 0 && (
				<Reorder.Group
					axis='y'
					values={addedTimeZones}
					onReorder={e => {
						setAddedTimeZones(e);
						setUserSettings({ ...userSettings, addedTimeZones: e });
					}}
				>
					<AnimatePresence mode='popLayout'>
						{addedTimeZones.map((addedTimeZone, i) => {
							const timeZoneName =
								addedTimeZone.timezone ||
								(addedTimeZone.states &&
									addedTimeZone.states[0].cities &&
									addedTimeZone.states[0].cities[0].timezone);

							let isCity = false;
							let isState = false;
							let isCountry = false;
							if (addedTimeZone.name) {
								isCountry = true;
							}
							if (addedTimeZone.states && addedTimeZone.states[0].name) {
								isState = true;
							}
							if (
								addedTimeZone.states &&
								addedTimeZone.states[0].cities &&
								addedTimeZone.states[0].cities[0].name
							) {
								isCity = true;
							}

							return (
								<Reorder.Item
									dragConstraints={{ top: -64, bottom: 64 }}
									className='added timezone'
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0, scale: 0.9 }}
									key={JSON.stringify(addedTimeZone)}
									value={addedTimeZone}
									layout
								>
									<div className='top'></div>
									<div className='bottom'>
										<div className='left'>
											<h2 className='timeZoneNameOfDefaultTimeZone'>
												{(isCity
													? addedTimeZone.states[0].cities[0].name
													: isState
													? addedTimeZone.states[0].name
													: addedTimeZone.name) +
													(isCity
														? ", " +
														  addedTimeZone.states[0].name +
														  ", " +
														  addedTimeZone.name
														: isState
														? ", " + addedTimeZone.name
														: "")}{" "}
												(
												{moment
													.tz(new Date(2023, 0, 1), timeZoneName)
													.zoneAbbr()}
												)
											</h2>
											<div className='timeAndDate current'>
												<span className='label'>Current Time and Date: </span>
												<span className='time'>
													{convertTimeZone(date, currentTimeZone, timeZoneName)
														.toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
															second: "2-digit",
															hour12: hourFormat === 12,
														})
														.replace(
															hourFormat === 12 ? /^00/ : /^24/,
															hourFormat === 12 ? "12" : "00"
														)}
												</span>
												<span className='date'>
													{", " +
														convertTimeZone(
															date,
															currentTimeZone,
															addedTimeZone.timezone
														).toLocaleDateString([], {
															weekday: "long",
															year: "numeric",
															month: "long",
															day: "numeric",
														})}
												</span>
												<div className='timeline current'>
													<div className='line'>
														<div className='numbers'>
															{[...Array(25).keys()].map(e => {
																return (
																	<span
																		className={
																			convertTimeZone(
																				date,
																				currentTimeZone,
																				addedTimeZone.timezone
																			).getHours() === e
																				? "highlighted"
																				: null
																		}
																		key={e}
																	>
																		{e}
																	</span>
																);
															})}
														</div>
													</div>
													<m.div
														className='circle'
														animate={{
															width:
																((convertTimeZone(
																	date,
																	currentTimeZone,
																	addedTimeZone.timezone
																) /
																	1000 -
																	convertTimeZone(
																		date,
																		currentTimeZone,
																		addedTimeZone.timezone
																	).setHours(0, 0, 0, 0) /
																		1000) /
																	(24 * 60 * 60)) *
																	100 +
																"%",
														}}
													></m.div>
												</div>
											</div>
											<AnimatePresence mode='wait'>
												{offsetTimeBy.hours +
													offsetTimeBy.minutes +
													offsetTimeBy.seconds !==
													0 && (
													<m.div
														initial={{ opacity: 0, height: 0, marginTop: 0 }}
														animate={{
															opacity: 1,
															height: "auto",
															marginTop: 16,
														}}
														exit={{ opacity: 0, height: 0, marginTop: 0 }}
														className='timeAndDate requested'
													>
														<span className='label'>
															Requested Time and Date:{" "}
														</span>
														<span className='time'>
															{offsetTime(
																convertTimeZone(
																	date,
																	currentTimeZone,
																	addedTimeZone.timezone
																),
																offsetTimeBy.hours,
																offsetTimeBy.minutes,
																offsetTimeBy.seconds
															)
																.toLocaleTimeString([], {
																	hour: "2-digit",
																	minute: "2-digit",
																	second: "2-digit",
																	hour12: hourFormat === 12,
																})
																.replace(
																	hourFormat === 12 ? /^00/ : /^24/,
																	hourFormat === 12 ? "12" : "00"
																)}
														</span>
														<span className='date'>
															{", " +
																offsetTime(
																	convertTimeZone(
																		date,
																		currentTimeZone,
																		addedTimeZone.timezone
																	),
																	offsetTimeBy.hours,
																	offsetTimeBy.minutes,
																	offsetTimeBy.seconds
																).toLocaleDateString([], {
																	weekday: "long",
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																})}
														</span>
														<div className='timeline requested'>
															<div className='line'>
																<div className='numbers'>
																	{[...Array(25).keys()].map(e => {
																		return (
																			<span
																				className={
																					offsetTime(
																						convertTimeZone(
																							date,
																							currentTimeZone,
																							addedTimeZone.timezone
																						),
																						offsetTimeBy.hours,
																						offsetTimeBy.minutes,
																						offsetTimeBy.seconds
																					).getHours() === e
																						? "highlighted"
																						: null
																				}
																				key={e}
																			>
																				{e}
																			</span>
																		);
																	})}
																</div>
															</div>
															<m.div
																className='circle'
																animate={{
																	width:
																		((offsetTime(
																			convertTimeZone(
																				date,
																				currentTimeZone,
																				addedTimeZone.timezone
																			),
																			offsetTimeBy.hours,
																			offsetTimeBy.minutes,
																			offsetTimeBy.seconds
																		) /
																			1000 -
																			offsetTime(
																				convertTimeZone(
																					date,
																					currentTimeZone,
																					addedTimeZone.timezone
																				),
																				offsetTimeBy.hours,
																				offsetTimeBy.minutes,
																				offsetTimeBy.seconds
																			).setHours(0, 0, 0, 0) /
																				1000) /
																			(24 * 60 * 60)) *
																			100 +
																		"%",
																}}
															></m.div>
														</div>
													</m.div>
												)}
											</AnimatePresence>
										</div>
										<div className='right'>
											<button
												onClick={() => {
													setAddedTimeZones(prev => {
														return prev.filter(item => item !== addedTimeZone);
													});
													setUserSettings({
														...userSettings,
														addedTimeZones: addedTimeZones.filter(
															item => item !== addedTimeZone
														),
													});
												}}
											>
												<FontAwesomeIcon icon={faXmark} />
											</button>
										</div>
									</div>
								</Reorder.Item>
							);
						})}
					</AnimatePresence>
				</Reorder.Group>
			)}

			{isFetchingTimeZone && (
				<div className='loaderContainer'>
					<FontAwesomeIcon
						className='spinner'
						icon={faSpinner}
						spin
						size='xl'
					/>
					<span className='loaderText'>{spinnerText}</span>
				</div>
			)}
		</div>
	);
};

const SelectMenu = ({
	userSettings,
	setUserSettings,
	Items,
	offsetTimeBy,
	setOffsetTimeBy,
}) => {
	return (
		<Select.Root
			// open={false}
			onValueChange={e => {
				setOffsetTimeBy(prev => ({ ...prev, sign: e === "before" ? -1 : 1 }));
				setUserSettings({
					...userSettings,
					offsetTimeBy: { ...offsetTimeBy, sign: e === "before" ? -1 : 1 },
				});
			}}
			value={offsetTimeBy.sign === 1 ? "after" : "before"}
		>
			<Select.Trigger className='SelectTrigger'>
				<Select.Value />
				<Select.Icon className='SelectIcon'>
					<FontAwesomeIcon icon={faChevronDown} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content className='SelectContent'>
					<Select.ScrollUpButton className='SelectScrollButton'>
						<FontAwesomeIcon icon={faChevronUp} />
					</Select.ScrollUpButton>
					<Select.Viewport className='SelectViewport'>
						{Items.map(Item => {
							return (
								<Select.Item className='SelectItem' key={Item} value={Item}>
									<Select.ItemText>{Item}</Select.ItemText>
									<Select.ItemIndicator className='SelectItemIndicator'>
										<FontAwesomeIcon icon={faCheck} />
									</Select.ItemIndicator>
								</Select.Item>
							);
						})}
					</Select.Viewport>
					<Select.ScrollDownButton className='SelectScrollButton'>
						<FontAwesomeIcon icon={faChevronDown} />
					</Select.ScrollDownButton>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
};

export default Home;
