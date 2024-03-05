import React, { useEffect } from "react";
import DashSidebar from "../components/DashSidebar";
import DashProfile from "../components/DashProfile";
import { useLocation } from "react-router-dom"; // to find the tab location
import { useState } from "react";

// useState to set tab , uselocation to get the location
// useEffect to search for the tab and to set it

// dashsidebar on left and profile on right side -> 2 different components
// also this page is locked only for the users who are signed in
// URLSearchParams is a built-in JavaScript object that provides methods for working with the query string of a URL.

function Dashboard() {
  const location = useLocation();

  const [Tab, setTab] = useState(""); // to get tab location

  useEffect(() => {
    const urlparams = new URLSearchParams(location.search); // put the url here
    const tabfromUrl = urlparams.get("tab"); // tell the exact value of tab ==> to goto that page
    if (tabfromUrl) {
      setTab(tabfromUrl);
    }
  }, [location.search]); // whenever this changes useEffect start the work

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:w-56">
        {/* Sidebar */}
        <DashSidebar />
      </div>
      {/* profile => will be shown only on profile tab */}
      {Tab === "profile" && <DashProfile />}
    </div>
  );
}

export default Dashboard;
