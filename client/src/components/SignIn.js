import React from "react";
import { Form, Input, Button, Typography, Row, Col, Switch, Layout, message } from "antd";
import { Link, useHistory } from "react-router-dom";
import "./Style.css";
import axios from "axios";
import apiConfig from '../apiConfig.json'
import { v4 as uuidv4 } from 'uuid';


const { Title } = Typography;
const { Content } = Layout;

const SignIn = () => {
    const [messageApi, contextHolder] = message.useMessage();  // Use message API

    const history = useHistory(); // Initialize history
    const getDeviceId = () => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = uuidv4();  // Tạo UUID mới nếu chưa có
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };
    const onFinish = async (values) => {
        console.log("Success:", values);
        const uuid = getDeviceId()
        const { email, password } = values;

        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/auth/login-uuid`, {
                username: email, // API may require `username` instead of `email`
                password,
                uuid
            });

            if (response.status === 200) { // Check response from server
                const { accessToken, role } = response.data;
                messageApi.open({ // Corrected message API usage
                    type: 'success',
                    content: 'Login successful!',
                });

                // Save login info in localStorage
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("role", role);

                // Redirect to QR page after saving token
                history.push("/qr");
            } else {
                messageApi.open({ // Corrected message API usage
                    type: 'error',
                    content: `Unexpected response: ${response.status}`,
                });
            }
        } catch (error) {
            console.log("Error:", error);
            messageApi.open({ // Corrected message API usage
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
                {contextHolder} {/* Context for the message API */}
                <Row gutter={[24, 0]} justify="center" align="middle" className="signin-row" style={{ minHeight: "100vh" }}>
                    <Col xs={24} sm={20} md={12} lg={8} className="signin-form-col">
                        <Title className="mb-15">Sign In</Title>
                        <Title className="font-regular text-muted" level={5}>
                            Enter your email and password to sign in
                        </Title>
                        <Form
                            onFinish={onFinish}
                            onFinishFailed={onFinishFailed}
                            layout="vertical"
                            className="signin-form"
                            initialValues={{ remember: true }}
                        >
                            <Form.Item
                                label="Email"
                                name="email"
                                rules={[{ required: true, message: "Please input your email!" }]}
                            >
                                <Input placeholder="Email" />
                            </Form.Item>

                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[{ required: true, message: "Please input your password!" }]}
                            >
                                <Input.Password placeholder="Password" />
                            </Form.Item>

                            <Form.Item name="remember" valuePropName="checked">
                                <Switch defaultChecked /> Remember me
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" block>
                                    SIGN IN
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
