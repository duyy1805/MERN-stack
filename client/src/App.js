import React from "react";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import SignIn from "./components/SignIn";
import SignIn_B2 from "./components/SignIn_B2";
import SignIn_B8 from "./components/SignIn_B8";
import PXVT from "./components/PXVT";
import Qr from "./components/Qr";
import User from "./components/QuanLyQuyTrinh/User";
import AdminDashboard from "./components/QuanLyQuyTrinh/AdminDashboard";
import PrivateRoute from "./components/PrivateRoute";
import PrivateRoute_B3 from "./components/PrivateRoute_B3";
import PrivateRoute_B8 from "./components/PrivateRoute_B8";
import NotFound from "./components/NotFound"
import CSPN from "./components/QuanLyChuyenMay/CSPN"
import QRCodeScanner from "./components/QRCodeScanner";
import ProductionPlan from "./components/QuanLyChuyenMay/ProductionPlan";
function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/QRCodeScanner" component={QRCodeScanner} />
        <Route exact path="/B3" component={SignIn} />
        <Route exact path="/B2" component={SignIn_B2} />
        <Route exact path="/B8" component={SignIn_B8} />
        <Route exact path="/CSPN" component={CSPN} />
        <Route exact path="/" component={NotFound} />
        <Route exact path="/ProductionPlan" component={ProductionPlan} />
        <PrivateRoute_B3 exact path="/B3/pxvt" component={PXVT} rolesAllowed={["admin"]} />
        <PrivateRoute path="/B2/qr" component={Qr} rolesAllowed={["user"]} />
        <PrivateRoute_B8 exact path="/B8/QLQT" component={User} rolesAllowed={["user"]} />
        <PrivateRoute_B8 exact path="/B8/AdminDashboard" component={AdminDashboard} rolesAllowed={["admin"]} redirectPath="B8/QLQT" />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}

export default App;
