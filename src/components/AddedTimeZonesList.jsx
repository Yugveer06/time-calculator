import React, { useEffect, useState } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
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
	// Global time override: { date: Date, sourceTimezone: string } or null for realtime
	// This represents "what if it's this date/time in sourceTimezone"
	const [globalTimeOverride, setGlobalTimeOverride] = useState(null);

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

	function offsetTime(date, hours = 0, minutes = 0, seconds = 0) {
		let result = new Date(date.getTime());
		result.setHours(result.getHours() + hours * offsetTimeBy.sign);
		result.setMinutes(result.getMinutes() + minutes * offsetTimeBy.sign);
		result.setSeconds(result.getSeconds() + seconds * offsetTimeBy.sign);
		return result;
	}

	// Function to get the display date for a specific timezone
	function getDisplayDateForTimezone(targetTimezone) {
		if (!globalTimeOverride) {
			// Real-time: convert current real time from system timezone  to target timezone
			return convertTimeZone(date, currentTimeZone, targetTimezone);
		} else {
			// Custom time: convert from source timezone to target timezone
			return convertTimeZone(
				globalTimeOverride.date,
				globalTimeOverride.sourceTimezone,
				targetTimezone
			);
		}
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
			// Set global time override with source timezone
			setGlobalTimeOverride({
				date: newDate,
				sourceTimezone: sourceTimezone,
			});
			setDate(newDate);
		}
	};

	return (
		<div className='addedTimeZones'>
			<SystemClockDisplay
				currentTimeZone={currentTimeZone}
				date={globalTimeOverride ? globalTimeOverride.date : date}
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

							// Get the display date for this timezone considering global override
							const displayDate = globalTimeOverride
								? convertTimeZone(
										globalTimeOverride.date,
										globalTimeOverride.sourceTimezone,
										timeZoneName
								  )
								: date;

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
