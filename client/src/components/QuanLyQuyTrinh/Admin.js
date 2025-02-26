import React, { useEffect, useState } from 'react';
import {
    Row,
    Col,
    Input,
    Table,
    Spin,
    message,
    Button,
    Modal,
    Tooltip,
    Upload,
    Form,
    DatePicker,
    Select,
    Layout,
    Menu,
    Dropdown,
    Avatar,
    Card
} from 'antd';
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
import "./Admin.css";

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
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý quy trình</div>
            <Dropdown overlay={menu} trigger={['click']}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ marginLeft: '8px' }}>{localStorage.getItem('HoTen')}</span>
                    {/* <SettingOutlined style={{ marginLeft: '8px' }} /> */}
                </div>
            </Dropdown>
        </Header>
    );
};

const Admin = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi quy trình
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu các version của quy trình được chọn (mỗi phiên bản duy nhất)
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn

    const [form] = Form.useForm();
    const [processForm] = Form.useForm();
    const [addProcessModalVisible, setAddProcessModalVisible] = useState(false);
    const [addVersionModalVisible, setAddVersionModalVisible] = useState(false);
    const [file, setFile] = useState(null);
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    // Modal nhận xét khi xem tài liệu
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');

    // Modal trạng thái người dùng của 1 version
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusData, setStatusData] = useState([]);

    const [messageApi, contextHolder] = message.useMessage();
    const currentRole = localStorage.getItem('role');

    // Hàm xử lý khi người dùng xác nhận nhận xét
    const handleConfirmComment = async () => {
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

    const handleOpenCommentModal = () => {
        setIsCommentModalVisible(true);
    };

    // Xử lý khi chọn file
    const handleFileChange = (info) => {
        console.log("Upload info:", info);
        if (info.fileList && info.fileList.length > 0) {
            setFile(info.fileList[0].originFileObj);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinhall`);
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
    const handleViewPdf = async (record) => {
        setCurrentRecord(record);
        if (record.PhienBan === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            const url = `${apiConfig.API_BASE_URL}/B8/viewPDF?QuyTrinhVersionId=${record.QuyTrinhVersionId}`;
            setPdfUrl(url);
            setPdfVisible(true);
        }
    };

    // Xử lý submit form thêm quy trình mới
    const handleAddProcess = async () => {
        try {
            const values = await processForm.validateFields();
            // Gọi API thêm quy trình
            await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinh`, values);
            message.success("Thêm quy trình thành công!");
            setAddProcessModalVisible(false);
            processForm.resetFields();
            fetchData();
        } catch (error) {
            message.error("Lỗi thêm quy trình: " + error.response?.data || error.message);
        }
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
            formData.append('CurrentUrl', window.location.href);

            await axios.post(`${apiConfig.API_BASE_URL}/B8/themquytrinhversion`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            messageApi.open({
                type: 'success',
                content: `Thêm phiên bản thành công!`,
            });
            fetchData();
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

    const optionsSelect = Array.from(
        new Set(data.map((item) => item.TenQuyTrinh).filter(Boolean))
    ).map((uniqueName) => ({
        label: uniqueName,
        value: uniqueName,
    }));

    const createFilters = (key) => {
        const uniqueValues = [...new Set(data.map((item) => item[key]))];
        return uniqueValues.map((value) => ({
            text: value,
            value,
        }));
    };

    const LPTFilters = createFilters('BoPhanBanHanh');
    // Các cột cho bảng chính (phiên bản mới nhất của mỗi quy trình)
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
            width: '30%',
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Bộ phận ban hành',
            dataIndex: 'BoPhanBanHanh',
            key: 'BoPhanBanHanh',
            align: "center",
            filters: LPTFilters,
            filterSearch: true,
            onFilter: (value, record) => record.BoPhanBanHanh.includes(value),
        },
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
            align: "center",
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?PhienBan=${record.PhienBan}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Tải PDF</a>;
            },
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
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

    // Hàm lấy dữ liệu từ API khi component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo QuyTrinhId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            // So sánh phiên bản (giả sử PhienBan là kiểu số)
            if (!grouped[key] || item.PhienBan > grouped[key].PhienBan) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => b.PhienBan - a.PhienBan);
    };

    // Hàm tìm kiếm theo tên quy trình (lọc trên dữ liệu phiên bản mới nhất)
    const onSearch = (value) => {
        const filtered = getLatestVersions(allData).filter(item =>
            item.TenQuyTrinh && item.TenQuyTrinh.toLowerCase().includes(value.toLowerCase())
        );
        setData(filtered);
    };
    const handleViewDetails = (QuyTrinhId, TenQuyTrinh) => {
        // Lấy tất cả các dòng có cùng QuyTrinhId được chọn
        const details = allData.filter(item => item.QuyTrinhId === QuyTrinhId);

        // Nhóm dữ liệu theo QuyTrinhVersionId: mỗi QuyTrinhVersionId chỉ lấy dòng đầu tiên gặp được
        const uniqueVersionsMap = new Map();
        details.forEach(item => {
            if (!uniqueVersionsMap.has(item.QuyTrinhVersionId)) {
                uniqueVersionsMap.set(item.QuyTrinhVersionId, item);
            }
        });

        const uniqueVersions = Array.from(uniqueVersionsMap.values());
        // Sắp xếp theo phiên bản giảm dần (giả sử trường PhienBan là số)
        uniqueVersions.sort((a, b) => b.PhienBan - a.PhienBan);

        setModalData(uniqueVersions);
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
            setData(getLatestVersions(allData)); // Nếu không chọn gì, hiển thị toàn bộ
        }
    };

    // Hàm render cột tùy thuộc vào role của người dùng và tên field cần xác nhận
    const renderConfirmColumn = (text, record, field) => {
        console.log("Duy", record)
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
            <Button type="primary" onClick={(e) => { e.stopPropagation(); confirmField(record, field) }}>
                Xác nhận
            </Button>
        );
    };

    // Hàm xử lý xác nhận
    const confirmField = async (record, field) => {
        const HoTen = localStorage.getItem('HoTen');
        const userId = localStorage.getItem('userId');
        console.log(`Xác nhận ${field} cho phiên bản ${record.VersionId} của ${userId}`);
        try {
            await axios.post(`${apiConfig.API_BASE_URL}/B8/confirm`, {
                VersionId: record.VersionId,
                field, // Trường cần cập nhật
                HoTen,
                userId,
            });
            message.success(`Xác nhận ${field} thành công!`);
            // Cập nhật lại state
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

    // ----- Các cột cho Modal "Xem chi tiết" chỉ hiển thị thông tin Version -----
    const modalVersionColumns = [
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
            align: "center",
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?PhienBan=${record.PhienBan}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Tải PDF</a>;
            },
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewStatus(record); }}
                >
                    Xem tất cả
                </Button>
            ),
        },
    ];

    // Hàm mở Modal trạng thái (danh sách người dùng cho version được chọn)
    const handleViewStatus = (record) => {
        // Lấy dữ liệu của phiên bản được chọn (các dòng dữ liệu có cùng VersionId)
        const usersData = allData.filter(item =>
            item.QuyTrinhVersionId === record.QuyTrinhVersionId && item.ChucVu !== "admin"
        );
        setStatusData(usersData);
        setStatusModalVisible(true);
    };

    return (
        <Layout className="Admin">
            <Content style={{ padding: 10, backgroundColor: '#162f48' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
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
                    {/* Bảng phiên bản mới nhất */}
                    <Col xs={24} sm={24}>
                        <Card style={{ backgroundColor: '#001529', border: 'none' }}>
                            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                                <Button type="primary" onClick={() => setAddProcessModalVisible(true)}>Thêm quy trình mới</Button>
                            </div>
                            {loading ? <Spin /> : (
                                <Table
                                    dataSource={data}
                                    columns={columns}
                                    rowKey="VersionId"
                                    onRow={(record) => ({
                                        onClick: () => handleViewPdf(record)
                                    })}
                                // rowClassName={(record) => record.PhienBan === 'Chưa xem' ? 'not-viewed' : ''}
                                />
                            )}
                        </Card>

                    </Col>
                </Row>
                {/* --- Modal "Xem tất cả các phiên bản" --- */}
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
                    className="modal-versions"
                    width={1000}
                    style={{ backgroundColor: '#001529' }}
                >
                    <Table
                        dataSource={modalData}
                        columns={modalVersionColumns}
                        rowKey="VersionId"
                        pagination={false}
                        className="table-versions"
                        onRow={(record) => ({
                            onClick: () => { setModalVisible(false); handleViewPdf(record) }
                        })}
                    />
                    {/* --- Modal Thêm Version --- */}
                    <Modal
                        title="Thêm Version Mới"
                        visible={addVersionModalVisible}
                        onCancel={() => setAddVersionModalVisible(false)}
                        className="modal-versions"
                        footer={[
                            <Button key="cancel" onClick={() => setAddVersionModalVisible(false)}>
                                Hủy
                            </Button>,
                            <Button key="submit" type="primary" onClick={handleAddVersion}>
                                Lưu
                            </Button>
                        ]}
                    >
                        <Form form={form} layout="vertical" className="form-add-version">
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
                {/* --- Modal Nhập nhận xét --- */}
                <Modal
                    title="Nhập nhận xét"
                    visible={isCommentModalVisible}
                    onOk={handleConfirmComment}
                    onCancel={() => setIsCommentModalVisible(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    className="modal-versions"
                >
                    <p>Nhập nhận xét của bạn:</p>
                    <Input.TextArea
                        rows={4}
                        placeholder="Nhập nhận xét (nếu có)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </Modal>
                {/* --- Modal trạng thái người dùng của phiên bản --- */}
                <Modal
                    className="modal-versions"
                    title="Trạng thái người nhận"
                    visible={statusModalVisible}
                    onCancel={() => setStatusModalVisible(false)}
                    width={1000}
                    footer={[
                        <Button key="close" onClick={() => setStatusModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                >
                    <Table
                        dataSource={statusData}
                        className="table-versions"
                        rowClassName={(record) => record.TrangThai === 'Chưa xem' ? 'not-viewed' : ''}
                        columns={[
                            {
                                title: 'Tên người dùng',
                                dataIndex: 'HoTen',
                                key: 'HoTen',
                            },
                            {
                                title: 'Chức vụ',
                                dataIndex: 'ChucVu', // Điều chỉnh key nếu tên field khác (vd: 'Chức vụ')
                                key: 'ChucVu',
                            },
                            {
                                title: 'Trạng thái',
                                dataIndex: 'TrangThai',
                                key: 'TrangThai',
                            },
                            {
                                title: 'Ngày xem',
                                dataIndex: 'NgayXem',
                                key: 'NgayXem',
                                render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '',
                            },
                            {
                                title: 'Nhận xét',
                                dataIndex: 'NhanXet',
                                key: 'NhanXet',
                            },
                        ]}
                        rowKey={(record, index) => `${record.VersionId}_${index}`}
                        pagination={false}
                    />
                </Modal>
                <Modal
                    title="Thêm Quy Trình Mới"
                    visible={addProcessModalVisible}
                    onCancel={() => setAddProcessModalVisible(false)}
                    className="modal-versions"
                    footer={[
                        <Button key="cancel" onClick={() => setAddProcessModalVisible(false)}>
                            Hủy
                        </Button>,
                        <Button key="submit" type="primary" onClick={handleAddProcess}>
                            Lưu
                        </Button>
                    ]}
                >
                    <Form form={processForm} className="form-add-version" layout="vertical">
                        <Form.Item
                            label="Mã Quy Trình"
                            name="MaSo"
                            rules={[{ required: true, message: 'Vui lòng nhập Mã Số!' }]}
                        >
                            <Input placeholder="Nhập mã quy trình" />
                        </Form.Item>
                        <Form.Item
                            label="Tên Quy Trình"
                            name="TenQuyTrinh"
                            rules={[{ required: true, message: 'Vui lòng nhập Tên Quy Trình!' }]}
                        >
                            <Input placeholder="Nhập tên quy trình" />
                        </Form.Item>
                        <Form.Item
                            label="Bộ phận ban hành"
                            name="BoPhanBanHanh"
                            rules={[{ required: true, message: 'Vui lòng nhập Bộ phận ban hành!' }]}
                        >
                            <Input placeholder="Nhập bộ phận" />
                        </Form.Item>
                    </Form>
                </Modal>
                {pdfVisible && (
                    <ViewerPDF
                        fileUrl={pdfUrl}
                        onClose={() => { fetchData(); setPdfVisible(false) }}
                        onComment={handleOpenCommentModal}
                    />
                )}
            </Content>
        </Layout>
    );
};

export default Admin;
