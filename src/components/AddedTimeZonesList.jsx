import { AnimatePresence, Reorder } from "framer-motion";
import AddedTimeZoneItem from "./AddedTimeZoneItem";
import LoadingSpinner from "./LoadingSpinner";
import SystemClockDisplay from "./SystemClockDisplay";

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
	date,
	globalTimeOverride,
	handleGlobalTimeChange,
}) => {
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
