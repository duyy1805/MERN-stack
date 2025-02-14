import React from "react";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import SignIn from "./components/SignIn";
import Qr from "./components/Qr"; // Import trang QR
import PrivateRoute from "./components/PrivateRoute";


function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={SignIn} />
        <PrivateRoute path="/qr" component={Qr} rolesAllowed={["admin", "user"]} /> {/* Route đến trang QR */}
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}

export default App;
