import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu, Dropdown, Avatar, List, Badge, message, Modal, Form, Button } from "antd";
import { UserOutlined, FileOutlined, DashboardOutlined, BellOutlined, FileTextOutlined } from "@ant-design/icons";
import Admin from "./Admin";
import Admin_SP from "./Admin_SP";
import axios from 'axios';
import apiConfig from '../../apiConfig.json';
import ChartDasdboard from "./ChartDasdboard";
import { Link, useHistory } from "react-router-dom";
import Admin_SP_Ikea from "./Admin_SP_Ikea";
import { saveAs } from "file-saver";
import { renderAsync } from "docx-preview";

const { Header, Sider, Content } = Layout;

const AdminDashboard = () => {
    const [selectedKey, setSelectedKey] = useState("ChartDasdboard");
    const [messageApi, contextHolder] = message.useMessage();
    const [notifications, setNotifications] = useState([]);
    const [feedbackRecord, setFeedbackRecord] = useState(null);
    const [feedbackRecord_, setFeedbackRecord_] = useState(null);
    const [gopY, setGopY] = useState(false);
    const [visible, setVisible] = useState(false);
    const [isModalSuaDoiOpen, setIsModalSuaDoiOpen] = useState(false);
    const [formSuaDoi] = Form.useForm();

    const containerRef = useRef(null);
    const fetchNotifications = async () => {
        const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinhfeedback`);
        setNotifications(res.data);
        console.log(res.data);
    };

    const handleOpenSuaDoiModal = () => {
        formSuaDoi.resetFields();
        setIsModalSuaDoiOpen(true);
    };

    const handleViewWord = async (record, isType2 = false) => {
        // Đánh dấu thông báo đã xem trong danh sách
        setNotifications(prev =>
            prev.map(n =>
                n.Id === record.Id ? { ...n, TrangThai: "Đã xem" } : n
            )
        );

        // Phần hiển thị tài liệu giữ nguyên
        if (!record?.Id) {
            messageApi.open({
                type: 'error',
                content: `Không có file Word để xem!`,
            });
            return;
        }

        if (isType2) {
            // setGopY(true);
            setFeedbackRecord_(record);
        } else {
            setFeedbackRecord(record);
        }

        try {
            const response = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWord?id=${record.Id}`,
                { responseType: "blob" }
            );

            if (response.status === 200) {
                setVisible(true);
                const arrayBuffer = await response.data.arrayBuffer();

                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                    await renderAsync(arrayBuffer, containerRef.current);
                }
            } else {
                message.error("Không lấy được file Word!");
            }
        } catch (error) {
            message.error(`Lỗi xem file Word: ${error.message}`);
        }
    };

    const handleSaveFile = async () => {
        try {
            const Id = gopY ? feedbackRecord_.Id : feedbackRecord.Id;
            const fileResponse = await axios.get(
                `${apiConfig.API_BASE_URL}/B8/viewWordConfirm?id=${Id}`,
                { responseType: "blob" }
            );

            // Gợi ý: lấy tên file từ header nếu server có gửi
            const contentDisposition = fileResponse.headers['content-disposition'];
            let fileName = "Phieu-hoan-chinh.docx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) {
                    fileName = decodeURIComponent(match[1]);
                }
            }

            saveAs(fileResponse.data, fileName);
        } catch (error) {
            message.error("Lỗi khi tải file phản hồi!");
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Cập nhật mỗi 30 giây
        return () => clearInterval(interval);
    }, []);

    const menu1 = (
        <div
            style={{
                width: 320,
                maxHeight: 400,
                overflowY: 'auto',
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: 8,
                marginRight: 10
            }}
        >
            <h4 style={{ marginBottom: 10, fontWeight: 'bold' }}>Thông báo</h4>
            <List
                itemLayout="horizontal"
                dataSource={notifications}
                locale={{ emptyText: 'Không có thông báo mới' }}
                renderItem={item => (
                    <List.Item
                        style={{
                            cursor: 'pointer',
                            padding: '10px 12px',
                            borderRadius: 6,
                            backgroundColor: item.TrangThai === 'Chưa xem' ? '#e6f7ff' : '#fff',
                            transition: 'background-color 0.3s',
                            marginBottom: 4,
                        }}
                        onClick={() => handleViewWord(item)}
                    >
                        <List.Item.Meta
                            avatar={<Avatar icon={<FileTextOutlined />} />}
                            title={
                                <span style={{ fontWeight: 500 }}>
                                    <b>{item.BoPhan}</b> phản hồi tài liệu <b>{item.QuyTrinhVersionId}</b>
                                </span>
                            }
                            description={
                                <span style={{ fontSize: 12, color: '#888' }}>{item.QuyTrinhVersionId}</span>
                            }
                        />
                    </List.Item>
                )}
            />
        </div>
    );

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
            {/* <Menu.Item key="account">
                <a href="/account">Tài khoản</a>
            </Menu.Item>
            <Menu.Item key="settings">
                <a href="/settings">Cài đặt</a>
            </Menu.Item> */}
            <Menu.Item key="logout" onClick={handleLogout}>
                Log Out
            </Menu.Item>
        </Menu>
    );
    const menuItems = [
        { key: "ChartDasdboard", icon: <UserOutlined />, label: "ChartDasdboard" },
        { key: "dashboard", icon: <DashboardOutlined />, label: "Quy trình" },
        { key: "documents", icon: <FileOutlined />, label: "Sản phẩm DEK" },
        { key: "documents_Ikea", icon: <FileOutlined />, label: "Sản phẩm IKEA" },
    ];

    const renderContent = () => {
        switch (selectedKey) {
            case "dashboard":
                return <Admin />;
            case "ChartDasdboard":
                return <ChartDasdboard />;
            case "documents":
                return <Admin_SP />;
            case "documents_Ikea":
                return <Admin_SP_Ikea />;
            default:
                return <h2>Welcome to Admin Panel</h2>;
        }
    };

    return (
        <Layout style={{ minHeight: "100vh", backgroundColor: "#162f48" }}>
            <Header
                style={{
                    // background: "#001529",
                    display: 'flex',
                    height: '64px',
                    justifyContent: 'space-between',
                    padding: "0 20px 0 10px",
                    textAlign: "center",
                    color: "#fff",
                    // boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
            >
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý tài liệu</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Dropdown overlay={menu1} placement="bottom" trigger={['hover']}>
                        <Badge count={(notifications || []).filter(n => n.TrangThai === 'Chưa xem').length}>
                            <BellOutlined style={{ fontSize: 20, color: 'white', cursor: 'pointer' }} />
                        </Badge>
                    </Dropdown>
                    <Dropdown
                        trigger={['hover']}
                        overlay={
                            <Menu>
                                <Menu.Item disabled key="userName" style={{ fontWeight: 'bold', color: '#1890ff' }}>
                                    {localStorage.getItem('HoTen')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item key="logout" onClick={handleLogout}>
                                    Đăng xuất
                                </Menu.Item>
                            </Menu>
                        }
                    >
                        <Avatar
                            icon={<UserOutlined />}
                            style={{ marginLeft: '20px', cursor: 'pointer' }}
                        />
                    </Dropdown>
                </div>
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
                    <Modal
                        title="Phản hồi"
                        open={visible}
                        onCancel={() => { setVisible(false); setGopY(false) }}
                        footer={[
                            <Button type="primary" danger onClick={handleSaveFile}>
                                Xóa
                            </Button>,
                            <Button onClick={handleSaveFile}>
                                Xuất
                            </Button>,
                            (gopY === false) && (
                                <Button type="primary" onClick={handleOpenSuaDoiModal}>
                                    Ý kiến của BPQLHT
                                </Button>
                            )
                        ]}
                        width={1000}
                    >
                        <div
                            ref={containerRef}
                            style={{
                                border: "1px solid #ccc",
                                // maxHeight: "800px",
                                overflowY: "auto",
                                background: "#fff",
                            }}
                        />
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminDashboard;
