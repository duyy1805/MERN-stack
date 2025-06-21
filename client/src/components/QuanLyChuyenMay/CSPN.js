import React, { useEffect, useState } from "react";
import { UploadOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Layout, Menu, theme, Card, Button } from 'antd';
import io from "socket.io-client";
import styles from './QLCM.module.css'
import CNPN_CM1 from "./CNPN_CM1";
import CNPN_CM2 from "./CNPN_CM2";
const { Header, Content, Footer, Sider } = Layout;

const App = () => {
    const [selectedKey, setSelectedKey] = useState("1");
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const items = [
        { key: "1", icon: <UserOutlined />, label: "Chuyền may 1" },
        { key: "2", icon: <VideoCameraOutlined />, label: "Chuyền may 2" },
        { key: "3", icon: <UploadOutlined />, label: "Chuyền may 3" },
    ];

    const renderContent = () => {
        try {
            switch (selectedKey) {
                case "1":
                case "3":
                    return <CNPN_CM1 />;
                case "2":
                    return <CNPN_CM2 />;
                default:
                    return <h2>Welcome to Admin Panel</h2>;
            }
        } catch (error) {
            console.error("Lỗi khi render content:", error);
            return <h2>Có lỗi xảy ra</h2>;
        }
    };
    return (
        <Layout>
            <Sider
                breakpoint="lg"
                collapsedWidth="0"
                onBreakpoint={(broken) => {
                    console.log(broken);
                }}
                onCollapse={(collapsed, type) => {
                    console.log(collapsed, type);
                }}
                style={{ minHeight: "100vh" }}
            >
                <div className={styles.logo} />
                <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} onClick={(e) => setSelectedKey(e.key)} items={items} />
            </Sider>
            <Layout>
                <Content
                    style={{
                        margin: 10,
                    }}
                >
                    {renderContent()}
                </Content>
            </Layout>
        </Layout>
    );
};
export default App;