/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import BreakTimeBump from './pages/BreakTimeBump';
import DirectorDashboard from './pages/DirectorDashboard';
import DirectorManagement from './pages/DirectorManagement';
import DirectorSignIn from './pages/DirectorSignIn';
import GameHistory from './pages/GameHistory';
import Home from './pages/Home';
import JoinTheLeague from './pages/JoinTheLeague';
import LeagueCalendar from './pages/LeagueCalendar';
import PayMyDues from './pages/PayMyDues';
import PlayerDatabase from './pages/PlayerDatabase';
import PlayerProfile from './pages/PlayerProfile';
import RecordGame from './pages/RecordGame';
import WinnersGallery from './pages/WinnersGallery';
import Leaderboard from './pages/Leaderboard';
import Locations from './pages/Locations';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BreakTimeBump": BreakTimeBump,
    "DirectorDashboard": DirectorDashboard,
    "DirectorManagement": DirectorManagement,
    "DirectorSignIn": DirectorSignIn,
    "GameHistory": GameHistory,
    "Home": Home,
    "JoinTheLeague": JoinTheLeague,
    "LeagueCalendar": LeagueCalendar,
    "PayMyDues": PayMyDues,
    "PlayerDatabase": PlayerDatabase,
    "PlayerProfile": PlayerProfile,
    "RecordGame": RecordGame,
    "WinnersGallery": WinnersGallery,
    "Leaderboard": Leaderboard,
    "Locations": Locations,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};