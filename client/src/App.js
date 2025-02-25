import React from "react";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import SignIn from "./components/SignIn";
import PXVT from "./components/PXVT";
import Qr from "./components/Qr";
import QLQT from "./components/QuanLyQuyTrinh/QLQT";
import AdminDashboard from "./components/QuanLyQuyTrinh/AdminDashboard";
import PrivateRoute from "./components/PrivateRoute";


function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={SignIn} />
        <PrivateRoute exact path="/pxvt" component={PXVT} rolesAllowed={["admin"]} />
        <PrivateRoute path="/qr" component={Qr} rolesAllowed={["user"]} /> {/* Route đến trang QR */}
        <Route exact path="/QLQT" component={QLQT} />
        <Route exact path="/AdminDashboard" component={AdminDashboard} />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}

export default App;
