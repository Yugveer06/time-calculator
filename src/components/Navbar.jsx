import React, { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faClose, faGear, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";

import { motion as m } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";

const Navbar = ({ hourFormat, setHourFormat, userSettings, setUserSettings }) => {
	const [settingsPopOverOpened, setSettingsPopOverOpened] = useState(false);
	const [theme, setTheme] = useState("light");

	const handleTheme = (e) => {
		setTheme(e);
		setUserSettings({ ...userSettings, theme: e });
	};
	return (
		<m.nav initial={{ y: "calc(-100% - 32px)" }} animate={{ y: 0 }}>
			<div className='left'>
				<div className='clockIcon'>
					<FontAwesomeIcon icon={faClock} size='xl' spin width={36} height={36} />
				</div>
				<h1>Time Calculator</h1>
			</div>
			<div className='right'>
				<Popover.Root open={settingsPopOverOpened} onOpenChange={setSettingsPopOverOpened}>
					<Popover.Trigger asChild>
						<button className='settingsButton' aria-label='Update dimensions'>
							<FontAwesomeIcon spin icon={faGear} />
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content className='PopoverContent' sideOffset={5}>
							<div className='PopoverHeader'>
								<h2>Settings</h2>
							</div>
							<div className='options'>
								<div className='listItem'>
									<span>Hour Format</span>
									<div className='switchContainer'>
										<button
											id='hourFormatSwitch'
											className={hourFormat === 12 ? "selected" : null}
											onClick={(event) => {
												event.target.blur();
												setHourFormat(12);
												setUserSettings({ ...userSettings, hourFormat: 12 });
											}}>
											12
										</button>
										<button
											className={hourFormat === 24 ? "selected" : null}
											onClick={(event) => {
												event.target.blur();
												setHourFormat(24);
												setUserSettings({ ...userSettings, hourFormat: 24 });
											}}>
											24
										</button>
									</div>
								</div>
								<div className='listItem'>
									<span>Theme</span>
									<div className='switchContainer'>
										<button
											id='themeSwitch'
											className={userSettings.theme === "light" ? "selected" : null}
											onClick={(event) => {
												event.target.blur();
												handleTheme("light");
											}}>
											<FontAwesomeIcon icon={faSun} />
										</button>
										<button
											className={userSettings.theme === "dark" ? "selected" : null}
											onClick={(event) => {
												event.target.blur();
												handleTheme("dark");
											}}>
											<FontAwesomeIcon icon={faMoon} />
										</button>
									</div>
								</div>
							</div>
							<Popover.Close className='PopoverClose' aria-label='Close'>
								<FontAwesomeIcon icon={faClose} />
							</Popover.Close>
							<Popover.Arrow className='PopoverArrow' />
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			</div>
		</m.nav>
	);
};

export default Navbar;
