import React, { useEffect, useState } from 'react';
import {
    Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip,
    Upload, Form, DatePicker, Select, Layout, Menu, Dropdown, Avatar,
    Card
} from 'antd';
import { PieChart, Pie, Cell, Tooltip as TooltipRechart, Legend } from "recharts";
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
// import './QLQT.css';
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
            background: "#001529",
            display: 'flex',
            height: '64px',
            justifyContent: 'space-between',
            padding: "0 20px 0 10px",
            textAlign: "center",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
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

const QLQT = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu phiên bản của quy trình được chọn
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn

    const [form] = Form.useForm();
    const [file, setFile] = useState(null);
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    // --- Modal nhận xét khi xem tài liệu ---
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');

    const [messageApi, contextHolder] = message.useMessage();
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinh`, {
                params: { userId } // truyền userId vào query string
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
    const handleViewPdf = async (record) => {
        setCurrentRecord(record);
        console.log(record)
        if (record.VersionId === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            const url = `${apiConfig.API_BASE_URL}/B8/viewPDF?QuyTrinhVersionId=${record.VersionId}`;
            setPdfUrl(url);
            setPdfVisible(true);
            try {
                const userId = localStorage.getItem('userId');
                await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                    NguoiDungId: parseInt(userId),
                    QuyTrinhVersionId: record.VersionId,
                    NhanXet: 'NULL',
                });
                message.success("Đã xem");
            } catch (error) {
                console.log(error)
                message.error("Có lỗi xảy ra khi đánh dấu đã xem: " + error.message);
            }
        }
    };
    // Xử lý submit form thêm phiên bản mới

    const optionsSelect = Array.from(
        new Set(data.map((item) => item.TenQuyTrinh).filter(Boolean))
    ).map((uniqueName) => ({
        label: uniqueName,
        value: uniqueName,
    }));

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
                    <Tooltip title={text}>
                        <span>{text.slice(0, 20)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
            align: 'center',
        },
        {
            title: 'Bộ phận ban hành',
            dataIndex: 'BoPhanBanHanh',
            key: 'BoPhanBanHanh',
            align: 'center',
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: 'center',
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.VersionId}`;
                return <div><a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Tải PDF</a></div>;
            },
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: 'center',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: 'center',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ghi chú',
            key: 'GhiChu',
            render: (_, record) => {
                // Kiểm tra BoPhanGui có null không
                const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
                return boPhanGuiArray.includes(record.BoPhan) ? 'Được gửi mail' : '';
            }
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

    // Hàm lấy dữ liệu từ API
    useEffect(() => {
        fetchData();
    }, []);
    console.log(allData)
    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo QuyTrinhId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            // So sánh phiên bản (giả sử PhienBan là kiểu int)
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
    // Khi nhấn nút "Xem tất cả", hiển thị modal với tất cả các phiên bản của quy trình được chọn
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
            setData(getLatestVersions(allData)); // Nếu không chọn gì, hiển thị toàn bộ
        }
    };

    // Định nghĩa cột cho bảng trong modal hiển thị danh sách phiên bản
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
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.VersionId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Tải PDF</a>;
            },
        },
        {
            title: 'Nhận xét',
            dataIndex: 'NhanXet',
            key: 'NhanXet',
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ghi chú',
            key: 'GhiChu',
            render: (_, record) => {
                // Kiểm tra BoPhanGui có null không
                const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
                return boPhanGuiArray.includes(record.BoPhan) ? 'Được gửi mail' : '';
            }
        }
    ];
    const taiLieuGuiMail = allData.filter(record => {
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
        return boPhanGuiArray.includes(record.BoPhan);
    });

    const soTaiLieuDaXem = taiLieuGuiMail.filter(record => record.TrangThai !== 'Chưa xem').length;
    const soTaiLieuChuaXem = taiLieuGuiMail.filter(record => record.TrangThai === 'Chưa xem').length;
    console.log(soTaiLieuChuaXem)
    const piedata = [
        { name: "Đã xem", value: soTaiLieuDaXem },
        { name: "Chưa xem", value: soTaiLieuChuaXem },
    ];
    const COLORS = ["#0088FE", "#f63d3de0"];
    return (
        <Layout style={{ minHeight: '100vh' }} classname="User">
            <AppHeader />
            <Content style={{ padding: 20 }}>
                {contextHolder}

                <Row gutter={[16, 16]}>
                    {/* Cột bên trái: ô tìm kiếm */}
                    <Col xs={24} sm={4}>
                        <Card title="Tài liệu được nhận">
                            <PieChart width={200} height={200}>
                                <Pie
                                    data={piedata}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label
                                >
                                    {piedata.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                    ))}
                                </Pie>
                                <TooltipRechart />
                                <Legend />
                            </PieChart>
                        </Card>
                        {/* </Col>
                    <Col xs={24} sm={4}> */}
                        <Card>
                            {/* <Search
                                placeholder="Nhập tên quy trình cần tìm"
                                enterButton="Tìm"
                                allowClear
                                onSearch={onSearch}
                                style={{ marginBottom: 16 }}
                            /> */}
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
                    {/* Cột bên phải: bảng danh sách phiên bản mới nhất */}
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
                        onRow={(record) => ({ onClick: () => { setModalVisible(false); handleViewPdf(record); } })}
                        rowClassName={(record) => record.TrangThai === 'Chưa xem' ? 'not-viewed' : ''}
                    />
                    {/* Modal thêm phiên bản */}
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
                        onClose={() => { fetchData(); setPdfVisible(false) }}
                        onComment={handleOpenCommentModal}
                    />
                )}
            </Content>
        </Layout>
    );
};

export default QLQT;
