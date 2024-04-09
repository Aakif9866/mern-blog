import React, { useEffect, useState } from "react";
import { Navbar, Dropdown, Avatar } from "flowbite-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TextInput, Button } from "flowbite-react";
import { AiOutlineSearch } from "react-icons/ai";
import { FaMoon, FaSun } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { toggleTheme } from "../redux/theme/themeSlice";
import { signoutSuccess } from "../redux/user/userSlice";

function Header() {
  const navigate = useNavigate();
  const path = useLocation().pathname; // to get the current location from the url
  //  to update the location with the help of active in Nav.links
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user); // we need this inorder to display some of the attributes in
  // The navbar
  console.log(currentUser);
  const { theme } = useSelector((state) => state.theme); // to find the icon

  const location = useLocation();
  const [searchTerm, setSeachTerm] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get("searchTerm");
    if (searchTermFromUrl) {
      setSeachTerm(searchTermFromUrl);
    }
  }, [location.search]);

  const handleSignout = async () => {
    try {
      const res = await fetch("/api/user/signout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signoutSuccess());
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(location.search);
    urlParams.set("searchTerm", searchTerm);
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  return (
    <Navbar className="border-b-2">
      <Link
        to="/"
        className="self-center whitespace-nowrap text-sm sm:text-xl font-semibold dark:text-white"
      >
        <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg text-white">
          Aakif's
        </span>
        Blog
      </Link>

      <form onSubmit={handleSubmit}>
        <TextInput
          type="text"
          placeholder="Search .... "
          rightIcon={AiOutlineSearch}
          className="hidden lg:inline"
          value={searchTerm}
          onChange={(e) => setSeachTerm(e.target.value)}
        />
      </form>

      <Button className="w-12 h-10 lg:hidden" color="gray" pill="true">
        <AiOutlineSearch className="" />
      </Button>

      <div className="flex gap-2 md:order-2">
        <Button
          className="w-12 h-10 hidden sm:inline "
          color="gray"
          pill="true"
          onClick={() => {
            dispatch(toggleTheme());
          }}
        >
          {theme === "light" ? <FaSun /> : <FaMoon />}
        </Button>
        {currentUser ? (
          <Dropdown
            arrowIcon={false}
            inline
            label={
              <Avatar alt="user" img={currentUser.profilePicture} rounded />
            }
          >
            <Dropdown.Header>
              <span className="block text-sm">@{currentUser.username}</span>
              <span className="block text-sm font-medium truncate">
                {currentUser.email}
              </span>
            </Dropdown.Header>
            <Link to={"/dashboard?tab=profile"}>
              <Dropdown.Item>Profile</Dropdown.Item>
            </Link>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleSignout}>Sign out</Dropdown.Item>
          </Dropdown>
        ) : (
          <Link to="/sign-in">
            <Button gradientDuoTone="purpleToBlue" outline>
              Sign In
            </Button>
          </Link>
        )}
        <Navbar.Toggle />
      </div>
      {/* the below component by default works in that way  */}
      {/* on right screen it collapses and the icon comes at right most  */}
      <Navbar.Collapse>
        <Navbar.Link active={path === "/"} as={"div"}>
          <Link to="/">Home</Link>
        </Navbar.Link>
        <Navbar.Link active={path === "/about"} as={"div"}>
          <Link to="/about">About</Link>
        </Navbar.Link>
        <Navbar.Link active={path === "/projects"} as={"div"}>
          <Link to="/projects">Projects</Link>
        </Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
  );
}

export default Header;

// <!-- This will only center text on screens 640px and wider, not on small screens --><div class="sm:text-center"></div>

// 2nd searchicon is hidden on large screen

//  eventhandlers in js

// In JavaScript, especially in React, there are different ways to handle event handlers like onClick. The two examples you provided demonstrate two different approaches:

// Using Arrow Function Inline:
// jsx
// Copy code
// onClick={() => {
//     dispatch(toggleTheme());
// }}

// In this approach, an inline arrow function is defined within the onClick attribute. This inline function then dispatches an action toggleTheme() when the click event occurs. This approach is useful when you need to pass parameters or execute multiple statements.

// Using a Function Reference:
// jsx
// Copy code
// onClick={handleSignout}
// Here, handleSignout refers to a function that's defined elsewhere in your component or imported from another module. When the click event occurs, this function will be invoked. This approach is commonly used for cleaner and more readable code, especially when the event handler function is reusable or complex.

// Both approaches are valid and have their use cases. The first one allows for inline logic and easy access to component state and props within the function, while the second one promotes cleaner and more modular code by separating the event handler logic from the JSX.
