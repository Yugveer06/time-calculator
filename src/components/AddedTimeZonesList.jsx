import React, { useEffect, useState } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import moment from "moment-timezone";
import SystemClockDisplay from "./SystemClockDisplay";
import AddedTimeZoneItem from "./AddedTimeZoneItem";
import LoadingSpinner from "./LoadingSpinner";

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
	// Global time override: Date object representing the absolute custom time, or null for real-time
	const [globalTimeOverride, setGlobalTimeOverride] = useState(null);

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

	// Helper to get a Date object that represents the time in targetTimezone
	// but in the local browser's timezone context (for display purposes)
	function getShiftedDate(absoluteDate, targetTimezone) {
		return new Date(
			absoluteDate.toLocaleString("en-US", { timeZone: targetTimezone })
		);
	}

	function offsetTime(date, hours = 0, minutes = 0, seconds = 0) {
		let result = new Date(date.getTime());
		result.setHours(result.getHours() + hours * offsetTimeBy.sign);
		result.setMinutes(result.getMinutes() + minutes * offsetTimeBy.sign);
		result.setSeconds(result.getSeconds() + seconds * offsetTimeBy.sign);
		return result;
	}

	const handleRemoveTimeZone = addedTimeZone => {
		setAddedTimeZones(prev => {
			return prev.filter(item => item !== addedTimeZone);
		});
		setUserSettings({
			...userSettings,
			addedTimeZones: addedTimeZones.filter(
				item => item !== addedTimeZone
			),
		});
	};

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

	return (
		<div className='addedTimeZones'>
			<SystemClockDisplay
				currentTimeZone={currentTimeZone}
				date={
					globalTimeOverride
						? getShiftedDate(globalTimeOverride, currentTimeZone)
						: date
				}
				hourFormat={hourFormat}
				offsetTimeBy={offsetTimeBy}
				offsetTime={offsetTime}
				convertTimeZone={convertTimeZone}
				onDateChange={handleGlobalTimeChange}
				isCustomTime={globalTimeOverride !== null}
				sourceTimezone={currentTimeZone}
			/>

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
							const timezoneKey = JSON.stringify(addedTimeZone);
							const timeZoneName =
								addedTimeZone.timezone ||
								(addedTimeZone.states &&
									addedTimeZone.states[0].cities &&
									addedTimeZone.states[0].cities[0].timezone);

							// Get the display date for this timezone
							const displayDate = globalTimeOverride
								? getShiftedDate(
										globalTimeOverride,
										timeZoneName
								  )
								: convertTimeZone(
										date,
										currentTimeZone,
										timeZoneName
								  );

							return (
								<AddedTimeZoneItem
									key={timezoneKey}
									addedTimeZone={addedTimeZone}
									date={displayDate}
									currentTimeZone={currentTimeZone}
									hourFormat={hourFormat}
									offsetTimeBy={offsetTimeBy}
									convertTimeZone={convertTimeZone}
									offsetTime={offsetTime}
									onRemove={() =>
										handleRemoveTimeZone(addedTimeZone)
									}
									onDateChange={handleGlobalTimeChange}
									isCustomTime={globalTimeOverride !== null}
									sourceTimezone={timeZoneName}
								/>
							);
						})}
					</AnimatePresence>
				</Reorder.Group>
			)}

			{isFetchingTimeZone && <LoadingSpinner spinnerText={spinnerText} />}
		</div>
	);
};

export default AddedTimeZonesList;
