import React, { useState } from "react";
import { Layout, Menu } from "antd";
import {
    UserOutlined,
    FileOutlined,
    DashboardOutlined,
} from "@ant-design/icons";
import Dashboard from "./QLQT"; // Import component Dashboard
import Admin from "./Admin";
const { Header, Sider, Content } = Layout;

const AdminDashboard = () => {
    const [selectedKey, setSelectedKey] = useState("dashboard");

    const menuItems = [
        { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "users", icon: <UserOutlined />, label: "Users" },
        { key: "documents", icon: <FileOutlined />, label: "Documents" },
    ];

    const renderContent = () => {
        switch (selectedKey) {
            case "dashboard":
                return <Admin />;
            // case "users":
            //     return <Users />;
            // case "documents":
            //     return <Documents />;
            default:
                return <h2>Welcome to Admin Panel</h2>;
        }
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    background: "#001529",
                    padding: 0,
                    textAlign: "center",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
            >
                <h1 style={{ color: "#fff" }}>Admin Dashboard</h1>
            </Header>
            <Layout style={{}}>
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

export default AdminDashboard;
