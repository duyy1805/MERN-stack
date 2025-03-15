import React, { useEffect, useState } from "react";
import { Route, Redirect } from "react-router-dom";
import axios from 'axios';
import apiConfig from '../apiConfig.json'
// Tạo PrivateRoute bảo vệ route dựa trên quyền
const PrivateRoute_B8 = ({ component: Component, rolesAllowed, ...rest }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const role = localStorage.getItem("role"); // Lấy role người dùng từ localStorage
    const accessToken = localStorage.getItem("accessToken"); // Kiểm tra người dùng đã đăng nhập chưa
    console.log(role);
    useEffect(() => {
        // Kiểm tra Access Token bằng cách gọi API xác thực token
        const checkTokenValidity = async () => {
            if (accessToken) {
                try {
                    const response = await axios.post(`${apiConfig.API_BASE_URL}/auth/verify-token`, { token: accessToken });
                    if (response.status === 200) {
                        setIsAuthenticated(true); // Token hợp lệ
                    } else {
                        setIsAuthenticated(false); // Token không hợp lệ
                        console.log(response.data.message);
                    }
                } catch (error) {
                    setIsAuthenticated(false); // Nếu có lỗi khi xác thực token (ví dụ hết hạn)
                }
            } else {
                setIsAuthenticated(false); // Nếu không có token
            }
            setIsLoading(false);
        };

        checkTokenValidity();
    }, [accessToken]);

    if (isLoading) {
        return <div>Loading...</div>; // Hiển thị loading khi đang kiểm tra token
    }

    return (
        <Route
            {...rest}
            render={(props) =>
                isAuthenticated ? (
                    rolesAllowed.includes(role) ? (
                        <Component {...props} /> // Nếu đúng quyền yêu cầu, render component
                    ) : (
                        // Nếu không đúng role, chuyển hướng
                        <Redirect
                            to={
                                role === "admin"
                                    ? "/B8/AdminDashboard"
                                    : role === "user"
                                        ? "/B8/QLQT"
                                        : "/B8"
                            }
                        />
                    )
                ) : (
                    // Nếu chưa đăng nhập hoặc token không hợp lệ, chuyển hướng đến trang đăng nhập
                    <Redirect to="/B8" />
                )
            }
        />
    );
};

export default PrivateRoute_B8;
