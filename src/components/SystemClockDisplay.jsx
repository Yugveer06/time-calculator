import React from "react";
import { AnimatePresence, motion as m } from "framer-motion";
import TimelineDisplay from "./TimelineDisplay";
import TimeEditPopover from "./TimeEditPopover";

const SystemClockDisplay = ({
	currentTimeZone,
	date,
	hourFormat,
	offsetTimeBy,
	offsetTime,
	convertTimeZone,
	onDateChange,
	isCustomTime,
	sourceTimezone,
}) => {
	return (
		<div className='default timezone'>
			<div className='top'>
				<div className='label'>System Clock</div>
			</div>
			<div className='bottom'>
				<div className='left'>
					<h2 className='timeZoneNameOfDefaultTimeZone'>
						{currentTimeZone}
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
									Current Time and Date:{" "}
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
							</div>
							<TimeEditPopover
								currentDate={date}
								onDateChange={onDateChange}
								isCustomTime={isCustomTime}
								sourceTimezone={sourceTimezone}
							/>
						</div>
						<TimelineDisplay
							date={date}
							currentTimeZone={currentTimeZone}
							timeZoneName={currentTimeZone}
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
								exit={{ opacity: 0, height: 0, marginTop: 0 }}
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
								<TimelineDisplay
									date={date}
									currentTimeZone={currentTimeZone}
									timeZoneName={currentTimeZone}
									convertTimeZone={convertTimeZone}
									offsetTimeBy={offsetTimeBy}
									offsetTime={offsetTime}
									type='requested'
								/>
							</m.div>
						)}
					</AnimatePresence>
				</div>
				<div className='right'></div>
			</div>
		</div>
	);
};

export default SystemClockDisplay;
