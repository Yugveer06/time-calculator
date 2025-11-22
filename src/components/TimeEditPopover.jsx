import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faClose, faClock } from "@fortawesome/free-solid-svg-icons";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";

const TimeEditPopover = ({
	currentDate,
	onDateChange,
	isCustomTime,
	sourceTimezone,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [tempDate, setTempDate] = useState("");
	const [tempTime, setTempTime] = useState("");

	const handleOpen = () => {
		// Initialize with current date/time when opening
		const date = new Date(currentDate);
		const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		const seconds = String(date.getSeconds()).padStart(2, "0");
		const timeStr = `${hours}:${minutes}:${seconds}`;

		setTempDate(dateStr);
		setTempTime(timeStr);
		setIsOpen(true);
	};

	const handleApply = () => {
		if (tempDate && tempTime) {
			const [hours, minutes, seconds = "00"] = tempTime.split(":");
			const newDate = new Date(tempDate);
			newDate.setHours(parseInt(hours, 10));
			newDate.setMinutes(parseInt(minutes, 10));
			newDate.setSeconds(parseInt(seconds, 10));
			onDateChange(newDate, sourceTimezone);
			setIsOpen(false);
		}
	};

	const handleSetRealTime = () => {
		onDateChange(null, sourceTimezone); // null means use real-time
		setIsOpen(false);
	};

	return (
		<Popover.Root open={isOpen} onOpenChange={setIsOpen}>
			<Tooltip.Provider delayDuration={300}>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<Popover.Trigger asChild>
							<button
								className='timeEditButton'
								onClick={handleOpen}
								aria-label='Edit time and date'
							>
								{isCustomTime ? (
									<FontAwesomeIcon icon={faClock} />
								) : (
									<FontAwesomeIcon icon={faPen} />
								)}
							</button>
						</Popover.Trigger>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className='TooltipContent'
							sideOffset={5}
						>
							{isCustomTime ? "Custom time set" : "Edit time"}
							<Tooltip.Arrow className='TooltipArrow' />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Popover.Portal>
				<Popover.Content
					className='TimeEditPopoverContent'
					sideOffset={5}
				>
					<div className='TimeEditPopoverHeader'>
						<h3>Set Custom Time & Date</h3>
						<Popover.Close
							className='TimeEditPopoverClose'
							aria-label='Close'
						>
							<FontAwesomeIcon icon={faClose} />
						</Popover.Close>
					</div>
					<div className='TimeEditPopoverBody'>
						<div className='inputGroup'>
							<label htmlFor='date-input'>Date</label>
							<input
								id='date-input'
								type='date'
								value={tempDate}
								onChange={e => setTempDate(e.target.value)}
								className='dateInput'
							/>
						</div>
						<div className='inputGroup'>
							<label htmlFor='time-input'>Time</label>
							<input
								id='time-input'
								type='time'
								step='1'
								value={tempTime}
								onChange={e => setTempTime(e.target.value)}
								className='timeInput'
							/>
						</div>
					</div>
					<div className='TimeEditPopoverActions'>
						<button
							className='applyButton'
							onClick={handleApply}
							disabled={!tempDate || !tempTime}
						>
							Apply
						</button>
						{isCustomTime && (
							<button
								className='resetButton'
								onClick={handleSetRealTime}
							>
								Set to Real Time
							</button>
						)}
					</div>
					<Popover.Arrow className='TimeEditPopoverArrow' />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default TimeEditPopover;
