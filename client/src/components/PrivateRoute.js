// src/components/PrivateRoute.js
import React from "react";
import { Route, Redirect } from "react-router-dom";

// Tạo PrivateRoute bảo vệ route dựa trên quyền
const PrivateRoute = ({ component: Component, rolesAllowed, ...rest }) => {
    const role = localStorage.getItem("role"); // Lấy role người dùng từ localStorage
    const isLoggedIn = localStorage.getItem("accessToken"); // Kiểm tra người dùng đã đăng nhập chưa

    return (
        <Route
            {...rest}
            render={(props) =>
                isLoggedIn ? (
                    // Kiểm tra role của người dùng có nằm trong rolesAllowed không
                    rolesAllowed.includes(role) ? (
                        <Component {...props} /> // Nếu đúng quyền yêu cầu, render component
                    ) : (
                        // Nếu không đúng role, chuyển hướng
                        <Redirect
                            to={
                                role === "admin"
                                    ? "/" // Chuyển hướng admin đến dashboard admin
                                    : role === "user"
                                        ? "/" // Chuyển hướng staff đến dashboard staff
                                        : "/" // Chuyển hướng customer đến dashboard customer
                            }
                        />
                    )
                ) : (
                    // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
                    <Redirect to="/" />
                )
            }
        />
    );
};

export default PrivateRoute;
