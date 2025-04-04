import React, { useEffect, useState } from 'react';
import {
    Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip,
    Upload, Form, DatePicker, Select, Layout, Menu, Dropdown, Avatar,
    Card, Typography, Tabs
} from 'antd';
import { PieChart, Pie, Cell, Tooltip as TooltipRechart, Legend, ResponsiveContainer } from "recharts";
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
import style from './QLQT.module.css';

const { Search } = Input;
const { Header, Content } = Layout;

const AppHeader = () => {
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

    return (
        <Header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            padding: '0 20px'
        }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý sản phẩm</div>
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

const QLTL = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các sản phẩm
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi sản phẩm
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [allProcessNames_, setAllProcessNames_] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu các version của sản phẩm được chọn (mỗi phiên bản duy nhất)
    const [modalVersionVisible, setModalVersionVisible] = useState(false);
    const [modalVersionData, setModalVersionData] = useState([]);

    const [modalTitle, setModalTitle] = useState(''); // tên sản phẩm được chọn
    const [modalTaiLieuTitle, setModalTaiLieuTitle] = useState('');

    const [modalTitleId, setModalTitleId] = useState(''); // id sản phẩm được chọn

    const [form] = Form.useForm();
    const [processForm] = Form.useForm();
    const [addProcessModalVisible, setAddProcessModalVisible] = useState(false);
    const [addVersionModalVisible, setAddVersionModalVisible] = useState(false);
    const [file, setFile] = useState(null);
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [selectedProcess_, setSelectedProcess_] = useState(null);
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
            console.log(currentRecord)
            await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewedTL`, {
                NguoiDungId: parseInt(userId),
                TaiLieuSanPhamId: currentRecord.TaiLieuId,
                NhanXet: comment
            });
            messageApi.open({ type: 'success', content: `Đã đánh dấu tài liệu là đã xem và ghi nhận nhận xét!` });
        } catch (error) {
            messageApi.open({ type: 'error', content: "Có lỗi xảy ra khi đánh dấu đã xem" });
        } finally {
            setIsCommentModalVisible(false);
            setComment('');
        }
    };

    const handleOpenCommentModal = () => {
        setIsCommentModalVisible(true);
    };


    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/sanpham`, {
                params: { userId } // truyền userId vào query string
            });
            const list = res.data.filter(item => item.KhachHang === "DEK");
            setAllData(list);
            setData(getLatestVersions(list));

            const names = Array.from(
                new Set(list.map((item) => item.TenSanPham).filter(Boolean))
            );
            setAllProcessNames(names);
        } catch (error) {
            message.error('Lỗi khi lấy dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };


    const handleViewPdf = async (record) => {
        setModalVisible(false);
        setModalVersionVisible(false);
        setCurrentRecord(record);
        console.log(record.TaiLieuId)
        if (record.TaiLieuId === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            const url = `${apiConfig.API_BASE_URL}/B8/viewTLPDF?TaiLieuId=${record.TaiLieuId}`;
            setPdfUrl(url);
            setPdfVisible(true);
            try {
                const userId = localStorage.getItem('userId');
                await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewedTL`, {
                    NguoiDungId: parseInt(userId),
                    TaiLieuSanPhamId: record.TaiLieuId,
                    NhanXet: 'NULL',
                });
                messageApi.open({
                    type: 'success',
                    content: `Đã xem`,
                });
            } catch (error) {
                console.log(error)
                message.error("Có lỗi xảy ra khi đánh dấu đã xem: " + error.message);
            }
        }
    };

    const optionsSelect = Array.from(
        new Set(data.map((item) => item.TenSanPham).filter(Boolean))
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

    const uniqueBoPhan = [...new Set(allData
        .map(item => item.BoPhan)
        .filter(bp => bp))] // Loại bỏ giá trị NULL hoặc rỗng

    const boPhanOptions = uniqueBoPhan.map(bp => ({
        value: bp,
        label: bp
    }));
    const LPTFilters = createFilters('BoPhanBanHanh');
    const LPTFilters_TenSanPham = createFilters('TenSanPham');
    const CCCodeFilters = createFilters('MaCC')
    const groupedData = Object.values(
        data.reduce((acc, item) => {
            const key = `${item.MaCC}-${item.TenSanPham}`;

            if (!acc[key]) {
                acc[key] = {
                    ...item,
                    key,  // Thêm key để React không bị lỗi render
                    subItems: [],
                    subItems_: [],
                };
            }

            if (item.CCCode === null && item.ItemCode === null) {
                acc[key].subItems.push({
                    ...item,
                    key: `${item.TaiLieuId}-${item.PhienBan}`
                });
            }
            if (item.CCCode === null && item.ItemCode !== null) {
                acc[key].subItems_.push({
                    ...item,
                    key: `${item.TaiLieuId}-${item.PhienBan}`
                });
            }

            return acc;
        }, {})
    );


    console.log(groupedData)
    const columns = [
        {
            title: "Khách hàng",
            dataIndex: "KhachHang",
            key: "KhachHang",
            editable: true,
        },
        {
            title: "Dòng hàng",
            dataIndex: "DongHang",
            key: "DongHang",
            editable: true,
        },
        {
            title: "CCCode",
            dataIndex: "MaCC",
            key: "MaCC",
            align: "center",
            filters: CCCodeFilters,
            filterSearch: true,
            onFilter: (value, record) => record.MaCC.includes(value),
        },
        {
            title: "Tên sản phẩm",
            dataIndex: "TenSanPham",
            key: "TenSanPham",
            width: "20%",
            filters: LPTFilters_TenSanPham,
            filterSearch: true,
            onFilter: (value, record) => record.TenSanPham.includes(value),
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
            title: "Thể loại",
            dataIndex: "TheLoai",
            key: "TheLoai",
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
    ];

    const expandColumns = [
        {
            title: "Tên tài liệu",
            dataIndex: "TenTaiLieu",
            key: "TenTaiLieu",
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
            title: "Bộ phận ban hành",
            dataIndex: "BoPhanBanHanh",
            key: "BoPhanBanHanh",
            align: "center",
        },
        {
            title: 'Mùa sản phẩm',
            dataIndex: 'MuaSanPham',
            key: 'MuaSanPham',
            align: "center",
        },
        {
            title: 'Phiên bản',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadTLPDF?TaiLieuId=${record.TaiLieuId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
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
            title: 'Chi Tiết',
            key: 'action',
            align: "center",
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(record.TenTaiLieu, record.TenSanPham, record.ItemCode) }}
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

    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo SanPhamId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = `${item.MaCC}-${item.TenTaiLieu}-${item.ItemCode}`;
            const version = parseFloat(item.PhienBan); // Chuyển đổi thành số

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao))
    };

    const handleViewDetails = (TenTaiLieu, TenSanPham, ItemCode) => {
        // Lọc ra các dòng có cùng TenTaiLieu và TenSanPham
        const details = allData.filter(item =>
            item.TenTaiLieu === TenTaiLieu && item.TenSanPham === TenSanPham && item.ItemCode === ItemCode
        );
        // Nhóm dữ liệu theo TaiLieuId, mỗi TaiLieuId chỉ lấy dòng có phiên bản cao nhất
        const uniqueVersionsMap = new Map();
        details.forEach(item => {
            const existingItem = uniqueVersionsMap.get(item.TaiLieuId);
            if (!existingItem || parseFloat(item.PhienBan) > parseFloat(existingItem.PhienBan)) {
                uniqueVersionsMap.set(item.TaiLieuId, item);
            }
        });
        // Chuyển Map thành Array và sắp xếp theo PhienBan giảm dần
        const uniqueVersions = Array.from(uniqueVersionsMap.values())
            .sort((a, b) => parseFloat(b.PhienBan) - parseFloat(a.PhienBan));

        // Cập nhật modal
        setModalVersionData(uniqueVersions);
        setModalTaiLieuTitle(TenTaiLieu);
        // setModalTitleId(TenTaiLieu);
        setModalVersionVisible(true);
    };

    // ----- Các cột cho Modal "Xem chi tiết" chỉ hiển thị thông tin Version -----
    const modalVersionColumns = [
        {
            title: 'Mùa sản phẩm',
            dataIndex: 'MuaSanPham',
            key: 'MuaSanPham',
            align: "center",
        },
        {
            title: 'Phiên bản',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadTLPDF?TaiLieuId=${record.TaiLieuId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Nhận xét',
            dataIndex: 'NhanXet',
            key: 'NhanXet',
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
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
    ];

    // Hàm mở Modal trạng thái (danh sách người dùng cho version được chọn)
    const handleViewStatus = (record) => {
        // Kiểm tra nếu BoPhanGui bị null hoặc undefined thì gán mảng rỗng []
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];

        // Lọc dữ liệu dựa trên VersionId và BoPhan có trong BoPhanGui
        const usersData = allData.filter(item =>
            item.TaiLieuId === record.TaiLieuId &&
            !item.ChucVu.toLowerCase().includes("admin") // Loại bỏ admin
        );

        setStatusData(usersData);
        setStatusModalVisible(true);
    };
    const homNay = dayjs();

    // Lọc tài liệu mới (trong 30 ngày gần đây)
    const taiLieuMoi = allData.filter(record => {
        if (!record.NgayTao) return false;
        const ngayTao = dayjs(record.NgayTao);
        return homNay.diff(ngayTao, "day") < 30;
    });
    console.log(taiLieuMoi)
    const uniqueQuyTrinh = new Set(taiLieuMoi.map(record => `${record.TenSanPham}_${record.TaiLieuId}`));
    const soQuyTrinhKhacNhau = uniqueQuyTrinh.size;

    const taiLieuGuiMail = allData.filter(record => {
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
        return record.TaiLieuId !== null && boPhanGuiArray.includes(record.BoPhan);
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
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card title="Tài liệu được nhận" style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={100}>
                                <PieChart >
                                    <Pie
                                        data={piedata}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={40}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label
                                    >
                                        {piedata.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <TooltipRechart />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Card title="Tài liệu mới" style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ textAlign: "center" }}>
                                {taiLieuMoi.length}
                            </Typography.Title>
                        </Card>
                    </Col>
                    {/* Bảng phiên bản mới nhất */}
                    <Col xs={24} sm={24}>

                        <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                            {loading ? <Spin /> : (
                                <Table
                                    columns={columns}
                                    dataSource={groupedData}
                                    scroll={{ y: 55 * 9 }}
                                    onRow={(record) => ({
                                        onClick: (event) => {
                                            setModalTitle(record.TenSanPham)
                                            setModalData(record); // Lưu dữ liệu của dòng được click
                                            setModalVisible(true); // Hiển thị modal
                                        },
                                    })}
                                    rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                                />
                            )}
                        </Card>


                    </Col>
                </Row>
                <Modal
                    title={`Chi tiết sản phẩm: ${modalTitle}`} // Sử dụng modalTitle
                    open={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    footer={null}
                    className={style.modalVersions}
                    width="80%"
                    style={{ backgroundColor: '#ffffff' }}
                >
                    <Card style={{ backgroundColor: '', border: 'none' }}>
                        <Tabs defaultActiveKey="1" className={style.customTabs}>
                            <Tabs.TabPane
                                tab={`Tài liệu theo CCCode (${modalData?.subItems?.length || 0})`}
                                key="1"
                            >
                                <Table
                                    className={style.tableVersions}
                                    columns={expandColumns}
                                    dataSource={modalData?.subItems || []} // Thay documentModalData thành modalData
                                    pagination={false}
                                    onRow={(record) => ({
                                        onClick: () => { handleViewPdf(record) }
                                    })}
                                    rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                                />
                            </Tabs.TabPane>
                            <Tabs.TabPane
                                tab={`Tài liệu theo ItemCode (${modalData?.subItems_?.length || 0})`}
                                key="2"
                            >
                                <Table
                                    className={style.tableVersions}
                                    columns={[
                                        expandColumns[0], // Cột đầu tiên giữ nguyên
                                        {
                                            title: "ItemCode",
                                            dataIndex: "ItemCode",
                                            key: "ItemCode",
                                            render: (text) => text || "N/A",
                                        },
                                        ...expandColumns.slice(1), // Giữ các cột còn lại sau cột đầu tiên
                                    ]}
                                    dataSource={modalData?.subItems_?.length ? modalData.subItems_ : []}
                                    pagination={false}
                                    onRow={(record) => ({
                                        onClick: () => { handleViewPdf(record) }
                                    })}
                                    rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                                />
                            </Tabs.TabPane>
                        </Tabs>
                    </Card>
                </Modal>
                <Modal
                    title={modalTaiLieuTitle}
                    open={modalVersionVisible}
                    onCancel={() => setModalVersionVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setModalVersionVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    className={style.modalVersions}
                    width="80%"
                    style={{ backgroundColor: '#ffffff' }}
                >
                    <Table
                        dataSource={modalVersionData}
                        columns={modalVersionColumns}
                        rowKey="TaiLieuId"
                        pagination={false}
                        className={style.tableVersions}
                        scroll={{ y: 55 * 9 }}
                        onRow={(record) => ({
                            onClick: () => { handleViewPdf(record) }
                        })}
                        rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                    />
                </Modal>
                {/* --- Modal Nhập nhận xét --- */}
                <Modal
                    title="Nhập nhận xét"
                    open={isCommentModalVisible}
                    onOk={handleConfirmComment}
                    onCancel={() => setIsCommentModalVisible(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    className={style.modalComment}
                >
                    <p>Chọn nhận xét của bạn:</p>
                    <Select
                        placeholder="Chọn nhận xét"
                        style={{ width: "100%" }}
                        value={comment}
                        onChange={(value) => setComment(value)}
                        options={[
                            { value: "Tiếp nhận", label: "Tiếp nhận" },
                            { value: "Đào tạo", label: "Đào tạo" },
                            { value: "Tuân thủ", label: "Tuân thủ" }
                        ]}
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

export default QLTL;
