import React, { useEffect, useState } from 'react';
import {
    Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip,
    Upload, Form, DatePicker, Select, Layout, Menu, Dropdown, Avatar,
    Card
} from 'antd';
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
import './QLQT.css';

const { Search } = Input;
const { Header, Content } = Layout;

const AppHeader = () => {
    const history = useHistory();
    const handleLogout = () => {
        // Xóa dữ liệu lưu trữ và chuyển hướng
        localStorage.removeItem('accessToken');
        localStorage.removeItem('role');
        localStorage.removeItem('HoTen');
        history.push('/login'); // chuyển hướng về trang login
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

    return (
        <Header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            padding: '0 20px'
        }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Tên Trang</div>
            <Dropdown overlay={menu} trigger={['click']}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ marginLeft: '8px' }}>{localStorage.getItem('HoTen')}</span>
                </div>
            </Dropdown>
        </Header>
    );
};

const QLQT = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi quy trình
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu phiên bản của quy trình được chọn
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn

    const [form] = Form.useForm();
    const [addVersionModalVisible, setAddVersionModalVisible] = useState(false);
    const [file, setFile] = useState(null);

    // --- Quản lý PDF và nhận xét ---
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [currentRecord, setCurrentRecord] = useState(null);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [comment, setComment] = useState('');

    const [messageApi, contextHolder] = message.useMessage();
    const currentRole = localStorage.getItem('role');

    // Xử lý khi chọn file
    const handleFileChange = (info) => {
        if (info.fileList && info.fileList.length > 0) {
            setFile(info.fileList[0].originFileObj);
        }
    };

    // Lấy dữ liệu từ API, truyền userId vào query string
    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinh`, {
                params: { userId }
            });
            const list = res.data;
            setAllData(list);
            setData(getLatestVersions(list));
            const names = Array.from(
                new Set(list.map((item) => item.TenQuyTrinh).filter(Boolean))
            );
            setAllProcessNames(names);
        } catch (error) {
            message.error('Lỗi khi lấy dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Khi người dùng click vào 1 hàng, mở PDF ngay lập tức
    const handleViewPdf = (record) => {
        setCurrentRecord(record);
        const url = `${apiConfig.API_BASE_URL}/B8/viewPDF?PhienBan=${record.PhienBan}`;
        setPdfUrl(url);
        setPdfVisible(true);
    };

    // Khi người dùng nhấn nút "Comment" trong ViewerPDF, mở modal nhập nhận xét
    const handleOpenCommentModal = () => {
        setIsCommentModalVisible(true);
    };

    // Khi người dùng xác nhận nhập nhận xét trong modal, gọi API và lưu nhận xét
    const handleConfirmComment = async () => {
        if (!currentRecord) return;
        try {
            const userId = localStorage.getItem('userId');
            await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                NguoiDungId: parseInt(userId),
                QuyTrinhVersionId: currentRecord.VersionId,
                NhanXet: comment
            });
            message.success("Đã đánh dấu tài liệu là đã xem và ghi nhận nhận xét!");
        } catch (error) {
            message.error("Có lỗi xảy ra khi đánh dấu đã xem: " + error.message);
        } finally {
            setIsCommentModalVisible(false);
            setComment('');
        }
    };

    // Đóng PDF
    const handleViewerClose = () => {
        setPdfVisible(false);
    };

    // Xử lý submit form thêm phiên bản mới
    const handleAddVersion = async () => {
        try {
            const values = await form.validateFields();
            if (!file) {
                messageApi.open({
                    type: 'error',
                    content: `Vui lòng tải lên file PDF!`,
                });
                return;
            }
            const formData = new FormData();
            formData.append('QuyTrinhId', modalTitleId);
            formData.append('TenQuyTrinh', modalTitle);
            formData.append('PhienBan', values.PhienBan);
            formData.append('NgayHieuLuc', values.NgayHieuLuc.format('YYYY-MM-DD'));
            formData.append('File', file);

            await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinhversion`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            messageApi.open({ type: 'success', content: `Thêm phiên bản thành công!` });
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinh`);
            const list = res.data;
            setAllData(list);
            setData(getLatestVersions(list));
            const details = list
                .filter(item => item.QuyTrinhId === modalTitleId)
                .sort((a, b) => b.PhienBan - a.PhienBan);
            setModalData(details);
            setAddVersionModalVisible(false);
            form.resetFields();
            setFile(null);
        } catch (errorInfo) {
            console.log("Lỗi validate form:", errorInfo);
            if (errorInfo.errorFields) {
                errorInfo.errorFields.forEach(field => {
                    message.error(field.errors[0]);
                });
            } else {
                message.error(`Lỗi: ${errorInfo.message}`);
            }
        }
    };

    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            if (!grouped[key] || item.PhienBan > grouped[key].PhienBan) {
                grouped[key] = item;
            }
        });
        return Object.values(grouped).sort((a, b) => b.PhienBan - a.PhienBan);
    };

    const onSearch = (value) => {
        const filtered = getLatestVersions(allData).filter(item =>
            item.TenQuyTrinh && item.TenQuyTrinh.toLowerCase().includes(value.toLowerCase())
        );
        setData(filtered);
    };

    const handleViewDetails = (QuyTrinhId, TenQuyTrinh) => {
        const details = allData
            .filter(item => item.QuyTrinhId === QuyTrinhId)
            .sort((a, b) => b.PhienBan - a.PhienBan);
        setModalData(details);
        setModalTitle(TenQuyTrinh);
        setModalTitleId(QuyTrinhId);
        setModalVisible(true);
    };

    const handleSelectProcess = (value) => {
        if (value) {
            const filteredData = getLatestVersions(
                allData.filter((item) => item.TenQuyTrinh === value)
            );
            setData(filteredData);
        } else {
            setData(getLatestVersions(allData));
        }
    };

    const renderConfirmColumn = (text, record, field) => {
        let allowedField;
        if (currentRole === "Trưởng phòng") {
            allowedField = "NguoiPheDuyet";
        } else if (currentRole === "Quản lý") {
            allowedField = "NguoiKiemTra";
        } else if (currentRole === "Nhân viên") {
            allowedField = "NguoiLap";
        }
        if (field !== allowedField) {
            return text;
        }
        if (text) {
            return text;
        }
        return (
            <Button type="primary" onClick={(e) => { e.stopPropagation(); confirmField(record, field); }}>
                Xác nhận
            </Button>
        );
    };

    const confirmField = async (record, field) => {
        const HoTen = localStorage.getItem('HoTen');
        const userId = localStorage.getItem('userId');
        try {
            await axios.post(`${apiConfig.API_BASE_URL}/B8/confirm`, {
                VersionId: record.VersionId,
                field,
                HoTen,
                userId,
            });
            message.success(`Xác nhận ${field} thành công!`);
            setAllData(prevData =>
                prevData.map(item =>
                    item.VersionId === record.VersionId ? { ...item, [field]: HoTen } : item
                )
            );
            setData(getLatestVersions(allData.map(item =>
                item.VersionId === record.VersionId ? { ...item, [field]: HoTen } : item
            )));
        } catch (error) {
            message.error(error.response?.data?.message || `Lỗi xác nhận ${field}`);
        }
    };

    const columns = [
        {
            title: 'Mã Quy Trình',
            dataIndex: 'MaSo',
            key: 'MaSo',
        },
        {
            title: 'Tên Quy Trình',
            dataIndex: 'TenQuyTrinh',
            key: 'TenQuyTrinh',
            render: (text) =>
                text && text.length > 20 ? (
                    <Tooltip title={text}><span>{text.slice(0, 20)}...</span></Tooltip>
                ) : text,
        },
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            render: (text, record) => {
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?PhienBan=${record.PhienBan}`;
                return (
                    <div>
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">Tải PDF</a>
                    </div>
                );
            },
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Người Lập',
            dataIndex: 'NguoiLap',
            key: 'NguoiLap',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiLap'),
        },
        {
            title: 'Người Kiểm Tra',
            dataIndex: 'NguoiKiemTra',
            key: 'NguoiKiemTra',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiKiemTra'),
        },
        {
            title: 'Người Phê Duyệt',
            dataIndex: 'NguoiPheDuyet',
            key: 'NguoiPheDuyet',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiPheDuyet'),
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(record.QuyTrinhId, record.TenQuyTrinh); }}
                >
                    Xem tất cả
                </Button>
            ),
        },
    ];

    const modalColumns = [
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            render: (text, record) => {
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?PhienBan=${record.PhienBan}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer">Tải PDF</a>;
            },
        },
        {
            title: 'Xem PDF',
            key: 'openPdf',
            render: (text, record) => {
                const pdfUrl = `${apiConfig.API_BASE_URL}/B8/viewPDF?PhienBan=${record.PhienBan}`;
                return (
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Mở PDF ở tab mới
                    </a>
                );
            },
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Người Lập',
            dataIndex: 'NguoiLap',
            key: 'NguoiLap',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiLap'),
        },
        {
            title: 'Người Kiểm Tra',
            dataIndex: 'NguoiKiemTra',
            key: 'NguoiKiemTra',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiKiemTra'),
        },
        {
            title: 'Người Phê Duyệt',
            dataIndex: 'NguoiPheDuyet',
            key: 'NguoiPheDuyet',
            render: (text, record) => renderConfirmColumn(text, record, 'NguoiPheDuyet'),
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Layout>
            <AppHeader />
            <Content style={{ padding: 20 }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={4}>
                        <Card>
                            <Search
                                placeholder="Nhập tên quy trình cần tìm"
                                enterButton="Tìm"
                                allowClear
                                onSearch={onSearch}
                                style={{ marginBottom: 16 }}
                            />
                            <Select
                                showSearch
                                size="large"
                                onChange={handleSelectProcess}
                                allowClear
                                placeholder="Chọn tên quy trình"
                                style={{ width: '100%' }}
                                options={allProcessNames.map(name => ({ label: name, value: name }))}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={20}>
                        <Card>
                            {loading ? <Spin /> : <Table
                                dataSource={data}
                                columns={columns}
                                rowKey="VersionId"
                                onRow={(record) => ({
                                    onClick: () => handleViewPdf(record)
                                })}
                                rowClassName={(record) => record.TrangThai === 'Chưa xem' ? 'not-viewed' : ''}
                            />}
                        </Card>
                    </Col>
                </Row>

                {/* Modal hiển thị tất cả các phiên bản của quy trình được chọn */}
                <Modal
                    title={modalTitle}
                    visible={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    footer={[
                        <Button key="add" type="primary" onClick={() => setAddVersionModalVisible(true)}>
                            Thêm Version
                        </Button>,
                        <Button key="close" onClick={() => setModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    width={1000}
                >
                    <Table
                        dataSource={modalData}
                        columns={modalColumns}
                        rowKey="VersionId"
                        pagination={false}
                        onRow={(record) => ({
                            onClick: () => { setModalVisible(false); handleViewPdf(record); }
                        })}
                    />
                    {/* Modal thêm phiên bản */}
                    <Modal
                        title="Thêm Version Mới"
                        visible={addVersionModalVisible}
                        onCancel={() => setAddVersionModalVisible(false)}
                        footer={[
                            <Button key="cancel" onClick={() => setAddVersionModalVisible(false)}>
                                Hủy
                            </Button>,
                            <Button key="submit" type="primary" onClick={handleAddVersion}>
                                Lưu
                            </Button>
                        ]}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item
                                label="Phiên Bản"
                                name="PhienBan"
                                rules={[{ required: true, message: 'Vui lòng nhập phiên bản!' }]}
                            >
                                <Input placeholder="Nhập số phiên bản" />
                            </Form.Item>
                            <Form.Item
                                label="Ngày Hiệu Lực"
                                name="NgayHieuLuc"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực!' }]}
                            >
                                <DatePicker format="YYYY-MM-DD" />
                            </Form.Item>
                            <Form.Item
                                label="Tải lên file PDF"
                                name="File"
                                rules={[{ required: true, message: 'Vui lòng tải lên file PDF!' }]}
                            >
                                <Upload
                                    beforeUpload={() => false}
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                >
                                    <Button icon={<UploadOutlined />}>Chọn File</Button>
                                </Upload>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Modal>

                {/* Modal nhập nhận xét */}
                <Modal
                    title="Nhập nhận xét"
                    visible={isCommentModalVisible}
                    onOk={handleConfirmComment}
                    onCancel={() => setIsCommentModalVisible(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                >
                    <p>Nhập nhận xét của bạn:</p>
                    <Input.TextArea
                        rows={4}
                        placeholder="Nhập nhận xét (nếu có)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </Modal>

                {pdfVisible && (
                    <ViewerPDF
                        fileUrl={pdfUrl}
                        onClose={handleViewerClose}
                        onComment={handleOpenCommentModal}
                    />
                )}
            </Content>
        </Layout>
    );
};

export default QLQT;
