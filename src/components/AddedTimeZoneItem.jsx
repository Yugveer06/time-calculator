import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, Reorder, motion as m } from "framer-motion";
import moment from "moment-timezone";
import TimelineDisplay from "./TimelineDisplay";
import TimeEditPopover from "./TimeEditPopover";
import TimezoneAdditionalInfo from "./TimezoneAdditionalInfo";

const AddedTimeZoneItem = React.forwardRef(
	(
		{
			addedTimeZone,
			date,
			currentTimeZone,
			hourFormat,
			offsetTimeBy,
			convertTimeZone,
			offsetTime,
			onRemove,
			onDateChange,
			isCustomTime,
			sourceTimezone,
		},
		ref
	) => {
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

		const getLocationName = () => {
			const primary = isCity
				? addedTimeZone.states[0].cities[0].name
				: isState
				? addedTimeZone.states[0].name
				: addedTimeZone.name;

			const secondary = isCity
				? ", " +
				  addedTimeZone.states[0].name +
				  ", " +
				  addedTimeZone.name
				: isState
				? ", " + addedTimeZone.name
				: "";

			return primary + secondary;
		};

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
				ref={ref}
			>
				<div className='top'></div>
				<div className='bottom'>
					<div className='left'>
						<h2 className='timeZoneNameOfDefaultTimeZone'>
							{getLocationName()} (
							{moment
								.tz(new Date(2023, 0, 1), timeZoneName)
								.zoneAbbr()}
							)
						</h2>
						<div className='timeAndDate current'>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
								<div>
									<span className='label'>
										{isCustomTime
											? "Custom Time and Date: "
											: "Current Time and Date: "}
									</span>
									<span className='time'>
										{date
											.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
												hour12: hourFormat === 12,
											})
											.replace(
												hourFormat === 12
													? /^00/
													: /^24/,
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
								</div>
								<div style={{ display: "flex", gap: "6px" }}>
									<TimezoneAdditionalInfo
										addedTimeZone={addedTimeZone}
									/>
									<TimeEditPopover
										currentDate={date}
										onDateChange={onDateChange}
										isCustomTime={isCustomTime}
										sourceTimezone={sourceTimezone}
									/>
								</div>
							</div>
							<TimelineDisplay
								date={date}
								currentTimeZone={addedTimeZone.timezone}
								timeZoneName={addedTimeZone.timezone}
								convertTimeZone={convertTimeZone}
								offsetTimeBy={offsetTimeBy}
								offsetTime={offsetTime}
								type='current'
							/>
						</div>
						<AnimatePresence mode='wait'>
							{offsetTimeBy.hours +
								offsetTimeBy.minutes +
								offsetTimeBy.seconds !==
								0 && (
								<m.div
									initial={{
										opacity: 0,
										height: 0,
										marginTop: 0,
									}}
									animate={{
										opacity: 1,
										height: "auto",
										marginTop: 16,
									}}
									exit={{
										opacity: 0,
										height: 0,
										marginTop: 0,
									}}
									className='timeAndDate requested'
								>
									<span className='label'>
										Requested Time and Date:{" "}
									</span>
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
												hourFormat === 12
													? /^00/
													: /^24/,
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
									<TimelineDisplay
										date={date}
										currentTimeZone={addedTimeZone.timezone}
										timeZoneName={addedTimeZone.timezone}
										convertTimeZone={convertTimeZone}
										offsetTimeBy={offsetTimeBy}
										offsetTime={offsetTime}
										type='requested'
									/>
								</m.div>
							)}
						</AnimatePresence>
					</div>
					<div className='right'>
						<button onClick={onRemove}>
							<FontAwesomeIcon icon={faXmark} />
						</button>
					</div>
				</div>
			</Reorder.Item>
		);
	}
);

export default AddedTimeZoneItem;
