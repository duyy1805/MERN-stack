import React, { useState } from "react";
import { Form, Input, Button, Typography, Row, Col, Switch, Layout, Radio, message } from "antd";
import { Link, useHistory } from "react-router-dom";
import "./Style.css";
import axios from "axios";
import apiConfig from '../apiConfig.json';
import { v4 as uuidv4 } from 'uuid';

const { Title } = Typography;
const { Content } = Layout;

const SignIn = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const history = useHistory();
    const [loginType, setLoginType] = useState("A"); // "A" hoặc "B"

    const getDeviceId = () => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };

    const loginAPI = async (loginType, email, password, uuid) => {
        if (loginType === "A") {
            return axios.post(`${apiConfig.API_BASE_URL}/auth/login-uuid`, {
                username: email,
                password,
                uuid,
            });
        } else if (loginType === "B") {
            return axios.post(`${apiConfig.API_BASE_URL}/auth/B8_login`, {
                username: email,
                password,
            });
        }
        throw new Error("Unsupported login type");
    };

    const handleLoginResponse = (loginType, data) => {
        if (loginType === "A") {
            const { accessToken, role } = data;
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("role", role);
            history.push("/qr");
        } else if (loginType === "B") {
            const { accessToken, userId, role, hoTen } = data;
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("userId", userId);
            localStorage.setItem("role", role);
            localStorage.setItem("HoTen", hoTen);
            history.push("/AdminDashboard");
        }
    };

    const onFinish = async (values) => {
        console.log("Success:", values);
        const uuid = getDeviceId();
        const { email, password } = values;

        try {
            const response = await loginAPI(loginType, email, password, uuid);
            if (response.status === 200) {
                handleLoginResponse(loginType, response.data);
                messageApi.open({
                    type: 'success',
                    content: 'Login successful!',
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: `Unexpected response: ${response.status}`,
                });
            }
        } catch (error) {
            console.log("Error:", error);
            messageApi.open({
                type: 'error',
                content: error.response?.data?.message || "Something went wrong, please try again.",
            });
        }
    };


    const onFinishFailed = (errorInfo) => {
        console.log("Failed:", errorInfo);
    };

    return (
        <Layout className="signin-layout">
            <Content className="signin-content">
                {contextHolder}
                <Row gutter={[24, 0]} justify="center" align="middle" className="signin-row" style={{ minHeight: "100vh" }}>
                    <Col xs={24} sm={20} md={12} lg={8} className="signin-form-col">
                        <Title className="mb-15">Log In</Title>
                        <Title className="font-regular text-muted" level={5}>
                            Enter your username and password to log in
                        </Title>
                        {/* Thêm lựa chọn loại đăng nhập */}
                        <Form
                            onFinish={onFinish}
                            onFinishFailed={onFinishFailed}
                            layout="vertical"
                            className="signin-form"
                            initialValues={{ remember: true, loginType: "A" }}
                        >
                            <Form.Item label="Login type" name="loginType">
                                <Radio.Group onChange={(e) => setLoginType(e.target.value)}>
                                    <Radio value="A">Phiếu xuất, Thiết bị phòng cháy</Radio>
                                    <Radio value="B">Quản lý tài liệu</Radio>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item
                                label="Username"
                                name="email"
                                rules={[{ required: true, message: "Please input your username!" }]}
                            >
                                <Input placeholder="Username" style={{ fontSize: 16 }} />
                            </Form.Item>

                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[{ required: true, message: "Please input your password!" }]}
                            >
                                <Input.Password placeholder="Password" style={{ fontSize: 16 }} />
                            </Form.Item>

                            <Form.Item name="remember" valuePropName="checked">
                                <Switch defaultChecked /> Remember me
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" block>
                                    LOG IN
                                </Button>
                            </Form.Item>

                            <p className="font-semibold text-muted text-center">
                                Don't have an account? <Link to="/sign-up" className="text-dark font-bold">Sign Up</Link>
                            </p>
                        </Form>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
};

export default SignIn;
