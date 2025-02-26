import React from "react";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import SignIn from "./components/SignIn";
import PXVT from "./components/PXVT";
import Qr from "./components/Qr";
import QLQT from "./components/QuanLyQuyTrinh/QLQT";
import AdminDashboard from "./components/QuanLyQuyTrinh/AdminDashboard";
import PrivateRoute from "./components/PrivateRoute";
import PrivateRoute_B8 from "./components/PrivateRoute_B8";


function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={SignIn} />
        <PrivateRoute exact path="/pxvt" component={PXVT} rolesAllowed={["admin"]} />
        <PrivateRoute path="/qr" component={Qr} rolesAllowed={["user"]} /> {/* Route đến trang QR */}
        <PrivateRoute_B8 exact path="/QLQT" component={QLQT} rolesAllowed={["admin", "user"]} />
        <PrivateRoute_B8 exact path="/AdminDashboard" component={AdminDashboard} rolesAllowed={["admin"]} redirectPath="/QLQT" />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}

export default App;
