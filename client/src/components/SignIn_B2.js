import React, { useState } from "react";
import { Form, Input, Button, Typography, Row, Col, Switch, Layout, message, Image } from "antd";
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

    const getDeviceId = () => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };

    const onFinish = async (values) => {
        console.log("Success:", values);
        const uuid = getDeviceId();
        const { email, password } = values;

        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/auth/login-uuid`, {
                username: email,
                password,
                uuid,
            });
            if (response.status === 200) {
                const { accessToken, role } = response.data;
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("role", role);
                history.push("B2/qr");
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
                            Thiết bị phòng cháy
                        </Title>
                        <div>
                            <Image
                                height={50}
                                preview={false} // Tắt chức năng phóng to
                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlE5WqC5kYtMhSvd07l4G6ClN9VlypQnrzzg&s"
                                style={{ cursor: "pointer" }} // Hiển thị con trỏ khi hover
                            />
                        </div>
                        {/* Thêm lựa chọn loại đăng nhập */}
                        <Form
                            onFinish={onFinish}
                            onFinishFailed={onFinishFailed}
                            layout="vertical"
                            className="signin-form"
                            initialValues={{ remember: true, loginType: "A" }}
                        >

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
