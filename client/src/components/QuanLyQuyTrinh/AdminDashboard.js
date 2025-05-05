import React, { useState, useEffect, useRef } from "react";
import {
    Layout, Menu, Dropdown, Input,
    Avatar, List, Badge, message, Modal, Form, Button
} from "antd";
import { UserOutlined, FileOutlined, DashboardOutlined, BellOutlined, FileTextOutlined } from "@ant-design/icons";
import Admin from "./Admin";
import Admin_TTDL from "./Admin_TTDL";
import Admin_SP from "./Admin_SP";
import axios from 'axios';
import apiConfig from '../../apiConfig.json';
import ChartDasdboard from "./ChartDasdboard";
import { Link, useHistory } from "react-router-dom";
import Admin_SP_Ikea from "./Admin_SP_Ikea";
import dayjs from 'dayjs';
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
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
        try {
            const [quytrinhRes, tailieuRes] = await Promise.all([
                axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinhfeedback`),
                axios.get(`${apiConfig.API_BASE_URL}/B8/tailieufeedback`)
            ]);

            const merged = [
                ...quytrinhRes.data.map(item => ({ ...item, type: 'quytrinh' })),
                ...tailieuRes.data.map(item => ({ ...item, type: 'tailieu' }))
            ].sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao));
            console.log("Merged notifications:", merged);
            setNotifications(merged);
        } catch (error) {
            console.error("Lỗi khi fetch notifications:", error);
        }
    };

    const handleOpenSuaDoiModal = () => {
        formSuaDoi.resetFields();
        setIsModalSuaDoiOpen(true);
    };

    const handleViewWord = async (record) => {
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

        await setFeedbackRecord(record);

        const apiEndpoint =
            record.type === 'tailieu'
                ? `${apiConfig.API_BASE_URL}/B8/viewWordTL?id=${record.Id}`
                : `${apiConfig.API_BASE_URL}/B8/viewWord?id=${record.Id}`;

        try {
            const response = await axios.get(apiEndpoint, { responseType: "blob" });
            if (response.status === 200) {
                setVisible(true);
                const arrayBuffer = await response.data.arrayBuffer();
                console.log("Kích thước file:", arrayBuffer.byteLength);

                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                    await renderAsync(arrayBuffer, containerRef.current);
                }
            } else {
                messageApi.open({
                    type: 'warning',
                    content: `Không lấy được file Word!`,
                });
            }
        } catch (error) {
            messageApi.open({
                type: 'warning',
                content: `Không lấy được file Word!`,
            });
        }
    };

    const handleGenerate = async (values) => {
        try {
            message.loading({ content: "Đang tạo file...", key: "docx" });
            console.log(feedbackRecord)
            const finalData = {
                ...values,
                NgayYKienBoPhanQuanLy: dayjs().format("DD/MM/YYYY"),
            };

            const apiEndpoint =
                feedbackRecord.type === 'tailieu'
                    ? `${apiConfig.API_BASE_URL}/B8/viewWordTL?id=${feedbackRecord.Id}`
                    : `${apiConfig.API_BASE_URL}/B8/viewWord?id=${feedbackRecord.Id}`;

            const fileResponse = await axios.get(apiEndpoint, {
                responseType: "blob"
            });

            const arrayBuffer = await fileResponse.data.arrayBuffer();
            const zip = new PizZip(arrayBuffer);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            doc.setData(finalData);
            doc.render();

            const output = doc.getZip().generate({ type: "blob" });
            saveAs(output, "output.docx");
            const fileName = `XacNhan_${feedbackRecord.MaSo}_${feedbackRecord.Id}.docx`;
            const formData = new FormData();
            formData.append("File", new File([output], fileName, {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }));
            formData.append("Id", feedbackRecord.Id);

            const apiEndpoint2 =
                feedbackRecord.type === 'tailieu'
                    ? `${apiConfig.API_BASE_URL}/B8/themtailieufeedbackconfirm`
                    : `${apiConfig.API_BASE_URL}/B8/themquytrinhfeedbackconfirm`;
            const response = await axios.post(apiEndpoint2, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 200) {
                message.success({ content: "Xuất file DOCX và gửi phản hồi thành công!", key: "docx" });
            } else {
                message.error("Gửi phản hồi thất bại!");
            }

            messageApi.open({ type: 'success', content: `Xuất file DOCX thành công!` });
            setIsModalSuaDoiOpen(false);
        } catch (error) {
            console.error("Lỗi khi tạo file DOCX:", error);
            message.error("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    const handleSaveFile = async () => {
        try {
            const Id = feedbackRecord?.Id;
            const apiEndpoint =
                feedbackRecord.type === 'tailieu'
                    ? `${apiConfig.API_BASE_URL}/B8/viewWordConfirmTL?id=${Id}`
                    : `${apiConfig.API_BASE_URL}/B8/viewWordConfirm?id=${Id}`;

            const fileResponse = await axios.get(apiEndpoint, {
                responseType: "blob"
            });

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
            messageApi.open({
                type: 'warning',
                content: `Không phải file hoàn chỉnh!`,
            });
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
                            backgroundColor: item.TrangThai !== 'Đã xem' ? '#e6f7ff' : '#fff',
                            transition: 'background-color 0.3s',
                            marginBottom: 4,
                        }}
                        onClick={() => handleViewWord(item)}
                    >
                        <List.Item.Meta
                            avatar={<Avatar icon={<FileTextOutlined />} />}
                            title={
                                <span style={{ fontWeight: 500 }}>
                                    <b>{item.BoPhan}</b> {item.FilePath ? 'yêu cầu sửa đổi' : item.FilePath_ ? 'góp ý' : 'phản hồi'} {item.type === 'tailieu' ? 'tài liệu' : 'quy trình'} <b>{item.TenQuyTrinh || item.TenTaiLieu}</b>
                                </span>
                            }
                            description={
                                <span style={{ fontSize: 12, color: '#888' }}>{item.NgayGui}</span>
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
        { key: "documents_TTDL", icon: <FileOutlined />, label: "Trung tâm đo lường" },
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
            case "documents_TTDL":
                return <Admin_TTDL />;
            default:
                return <h2>Welcome to Admin Panel</h2>;
        }
    };

    return (
        <Layout style={{ minHeight: "100vh", backgroundColor: "#162f48" }}>
            <Header
                style={{
                    display: 'flex',
                    height: '64px',
                    justifyContent: 'space-between',
                    padding: "0 20px 0 10px",
                    textAlign: "center",
                    color: "#fff",
                }}
            >
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý tài liệu</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Dropdown overlay={menu1} placement="bottom" trigger={['hover']}>
                        <Badge count={(notifications || []).filter(n => n.TrangThai !== 'Đã xem').length}>
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
                    {contextHolder}
                    <Modal
                        title="Phản hồi"
                        open={visible}
                        onCancel={() => { setVisible(false); setGopY(false) }}
                        footer={[
                            (feedbackRecord?.FilePath === null) && (
                                <Button key="export" onClick={handleSaveFile}>
                                    Xuất
                                </Button>
                            ),
                            (feedbackRecord?.FilePath_ === null) && (
                                <Button key="feedback" type="primary" onClick={handleOpenSuaDoiModal}>
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
                                overflowY: "auto",
                                background: "#fff",
                            }}
                        />
                    </Modal>
                    <Modal
                        title="Nhập Dữ Liệu Tạo DOCX"
                        open={isModalSuaDoiOpen}
                        onCancel={() => setIsModalSuaDoiOpen(false)}
                        footer={null}
                        width={800}
                    >
                        <Form form={formSuaDoi} layout="vertical" onFinish={handleGenerate}>

                            <Form.Item label="Ý kiến của Bộ phận Quản lý hệ thống" name="YKienBoPhanQuanLy">
                                <Input.TextArea />
                            </Form.Item>
                            <Form.Item label="Chữ ký (ghi rõ họ tên) của Bộ phận Quản lý hệ thống" name="ChuKyBoPhanQuanLy">
                                <Input />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Xuất file
                                </Button>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminDashboard;
