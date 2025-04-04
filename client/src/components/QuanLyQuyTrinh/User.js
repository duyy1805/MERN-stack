import React, { useState } from "react";
import { Layout, Menu, Dropdown, Avatar } from "antd";
import {
    UserOutlined,
    FileOutlined,
    DashboardOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";
import QLQT from "./QLQT";
import QLTL from "./QLTL";
import QLTL_Ikea from "./QLTL_Ikea";
import { Link, useHistory } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const User = () => {
    const [selectedKey, setSelectedKey] = useState("QLQT");

    const history = useHistory();
    const handleLogout = () => {
        // Xóa dữ liệu lưu trữ và chuyển hướng
        localStorage.removeItem('accessToken');
        localStorage.removeItem('role');
        localStorage.removeItem('HoTen');
        history.push('/B8'); // chuyển hướng về trang login
    };
    const menu = (
        <Menu>
            <Menu.Item key="account">
                <a href="/account">Tài khoản</a>
            </Menu.Item>
            <Menu.Item key="settings">
                <a href="/settings">Cài đặt</a>
            </Menu.Item>
            <Menu.Item key="logout" onClick={handleLogout}>
                Log Out
            </Menu.Item>
        </Menu>
    );
    const menuItems = [
        { key: "QLQT", icon: <DashboardOutlined />, label: "Quy trình" },
        { key: "QLTL", icon: <FileOutlined />, label: "Sản phẩm DEK" },
        { key: "QLTL_Ikea", icon: <FileOutlined />, label: "Sản phẩm IKEA" },
        // { key: "ChartDasdboard", icon: <UserOutlined />, label: "ChartDasdboard" },
    ];

    const renderContent = () => {
        switch (selectedKey) {
            case "QLQT":
                return <QLQT />;
            case "QLTL":
                return <QLTL />;
            case "QLTL_Ikea":
                return <QLTL_Ikea />;
            // case "documents":
            //     return <Documents />;
            default:
                return <h2>Welcome to Admin Panel</h2>;
        }
    };

    return (
        <Layout style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
            <Header
                style={{
                    display: 'flex',
                    height: '64px',
                    justifyContent: 'space-between',
                    padding: "0 20px 0 10px",
                    textAlign: "center",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
            >
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý tài liệu</div>
                <Dropdown overlay={menu} trigger={['click']}>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <Avatar icon={<UserOutlined />} />
                        <span style={{ marginLeft: '8px' }}>{localStorage.getItem('HoTen')}</span>
                        {/* <SettingOutlined style={{ marginLeft: '8px' }} /> */}
                    </div>
                </Dropdown>
            </Header>
            <Layout >
                <Sider collapsible>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        onClick={(e) => setSelectedKey(e.key)}
                        items={menuItems}
                    />
                </Sider>
                <Content style={{ margin: 0, padding: 0 }}>
                    {renderContent()}
                </Content>
            </Layout>
        </Layout>
    );
};

export default User;
