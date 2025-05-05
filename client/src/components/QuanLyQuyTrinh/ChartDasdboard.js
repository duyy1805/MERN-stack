import React, { useEffect, useState } from 'react';
import {
    Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip,
    Upload, Form, DatePicker, Select, Layout, Menu, Dropdown,
    Avatar, Card, Typography
} from 'antd';
import {
    PieChart, Pie, Legend, Sector, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { UploadOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import { Link, useHistory } from "react-router-dom";
import style from "./Admin.module.css";

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
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Quản lý tài liệu</div>
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
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', // Màu cũ
    '#D3D3D3', // Xám đậm
    '#2E8B57', // Xanh lá đậm
    '#9932CC', // Tím sẫm
    '#8B0000', // Đỏ đậm
    '#FF4500', // Cam lửa
    '#FFD700', // Xanh navy
    '#006400', // Xanh lá rừng
    '#B8860B', // Vàng nâu
    '#4682B4', // Xanh thép
    '#D2691E'  // Nâu đất
];
const ChartDasdboard = () => {
    const [allData, setAllData] = useState([]);
    const [data, setData] = useState([]);
    const [allDataTL, setAllDataTL] = useState([]);
    const [dataTL, setDataTL] = useState([]);
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu các version của quy trình được chọn (mỗi phiên bản duy nhất)
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn


    const [chartData, setChartData] = useState([]);
    const [lineChartData, setLineChartData] = useState([]);
    const [chartDataTL, setChartDataTL] = useState([]);
    const [lineChartDataTL, setLineChartDataTL] = useState([]);
    const [chartDataTL_IKEA, setChartDataTL_IKEA] = useState([]);
    const [lineChartDataTL_IKEA, setLineChartDataTL_IKEA] = useState([]);
    // Modal nhận xét khi xem tài liệu
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');

    // Modal trạng thái người dùng của 1 version
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusData, setStatusData] = useState([]);

    const [messageApi, contextHolder] = message.useMessage();
    const currentRole = localStorage.getItem('role');




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
            const groupedData = getLatestVersions(list).reduce((acc, item) => {
                const boPhan = item.BoPhanBanHanh || "Không xác định";
                if (!acc[boPhan]) {
                    acc[boPhan] = { name: boPhan, value: 0 };
                }
                acc[boPhan].value += 1;
                return acc;
            }, {});
            const formattedData = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name, 'vi'));;
            setChartData(formattedData);
            setAllProcessNames(names);
        } catch (error) {
            message.error('Lỗi khi lấy dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDataTL = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/sanphamall`);
            const list = res.data;
            setAllDataTL(list);
            setDataTL(getLatestVersionsTL(list));

            const names = Array.from(
                new Set(list.map((item) => item.BoPhanBanHanh).filter(Boolean))
            );
            const groupedData = getLatestVersionsTL_(list).filter(item => item.KhachHang === "DEK").reduce((acc, item) => {
                const boPhan = item.DongHang || "Không xác định";
                if (!acc[boPhan]) {
                    acc[boPhan] = { name: boPhan, value: 0 };
                }
                acc[boPhan].value += 1;
                return acc;
            }, {});
            const formattedData = Object.values(groupedData);

            console.log(formattedData)
            setChartDataTL(formattedData);
            const groupedData_ = getLatestVersionsTL_(list).filter(item => item.KhachHang === "IKEA").reduce((acc, item) => {
                const boPhan = item.DongHang || "Không xác định";
                if (!acc[boPhan]) {
                    acc[boPhan] = { name: boPhan, value: 0 };
                }
                acc[boPhan].value += 1;
                return acc;
            }, {});
            const formattedData_ = Object.values(groupedData_);
            setChartDataTL_IKEA(formattedData_);
            setAllProcessNames(names);
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Lỗi lấy dữ liệu`,
            });
        } finally {
            setLoading(false);
            // setAllProcessNames_([]);
        }
    };
    const uniqueBoPhan = [...new Set(allData
        .map(item => item.BoPhan)
        .filter(bp => bp))] // Loại bỏ giá trị NULL hoặc rỗng

    const boPhanOptions = uniqueBoPhan.map(bp => ({
        value: bp,
        label: bp
    }));

    useEffect(() => {
        if (allData.length > 0) {
            const homNay = dayjs();
            const last7Days = Array.from({ length: 30 }, (_, i) =>
                homNay.subtract(i, "day").format("YYYY-MM-DD")
            ).reverse();

            // Tạo Set để kiểm tra các QuyTrinhVersionId đã đếm theo từng ngày
            const countedSet = new Set();
            const processCountByDay = {};

            allData.forEach(record => {
                if (!record.NgayTao || !record.QuyTrinhVersionId) return;
                const ngayTao = dayjs(record.NgayTao).format("YYYY-MM-DD");
                const uniqueKey = `${record.QuyTrinhVersionId}`;

                if (last7Days.includes(ngayTao) && !countedSet.has(uniqueKey)) {
                    countedSet.add(uniqueKey);
                    processCountByDay[ngayTao] = (processCountByDay[ngayTao] || 0) + 1;
                }
            });

            // Chuyển đổi dữ liệu thành mảng để hiển thị trên LineChart
            const formattedLineChartData = last7Days.map(date => ({
                date,
                count: processCountByDay[date] || 0
            }));

            setLineChartData(formattedLineChartData);
        }
    }, [allData]);
    useEffect(() => {
        if (allDataTL.length > 0) {
            const homNay = dayjs();
            const last7Days = Array.from({ length: 30 }, (_, i) =>
                homNay.subtract(i, "day").format("YYYY-MM-DD")
            ).reverse();

            // Tạo Set để kiểm tra các QuyTrinhVersionId đã đếm theo từng ngày
            const countedSet = new Set();
            const processCountByDay = {};
            const countedSet_ = new Set();
            const processCountByDay_ = {};

            allDataTL.filter(item => item.KhachHang === "DEK").forEach(record => {
                if (!record.NgayTao || !record.TaiLieuId) return;
                const ngayTao = dayjs(record.NgayTao).format("YYYY-MM-DD");
                const uniqueKey = `${record.TaiLieuId}`;

                if (last7Days.includes(ngayTao) && !countedSet.has(uniqueKey)) {
                    countedSet.add(uniqueKey);
                    processCountByDay[ngayTao] = (processCountByDay[ngayTao] || 0) + 1;
                }
            });

            // Chuyển đổi dữ liệu thành mảng để hiển thị trên LineChart
            const formattedLineChartData = last7Days.map(date => ({
                date,
                count: processCountByDay[date] || 0
            }));

            setLineChartDataTL(formattedLineChartData);

            allDataTL.filter(item => item.KhachHang === "IKEA").forEach(record => {
                if (!record.NgayTao || !record.TaiLieuId) return;
                const ngayTao = dayjs(record.NgayTao).format("YYYY-MM-DD");
                const uniqueKey = `${record.TaiLieuId}`;

                if (last7Days.includes(ngayTao) && !countedSet_.has(uniqueKey)) {
                    countedSet_.add(uniqueKey);
                    processCountByDay_[ngayTao] = (processCountByDay_[ngayTao] || 0) + 1;
                }
            });

            // Chuyển đổi dữ liệu thành mảng để hiển thị trên LineChart
            const formattedLineChartData_ = last7Days.map(date => ({
                date,
                count: processCountByDay_[date] || 0
            }));

            setLineChartDataTL_IKEA(formattedLineChartData_);
        }
    }, [allDataTL]);
    useEffect(() => {
        fetchData();
        fetchDataTL();
    }, []);

    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo QuyTrinhId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            if (!grouped[key] || item.PhienBan > grouped[key].PhienBan) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => b.PhienBan - a.PhienBan);
    };
    const getLatestVersionsTL = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = `${item.MaCC}-${item.TenTaiLieu}-${item.ItemCode}`;
            const version = parseFloat(item.PhienBan);

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => b.NgayTao - a.NgayTao);
    };
    const getLatestVersionsTL_ = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = `${item.MaCC}`;
            const version = parseFloat(item.PhienBan);

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => b.NgayTao - a.NgayTao);
    };
    const taiLieuMoi = allData.filter(record => {
        if (!record.NgayTao) return false;
        const ngayTao = dayjs(record.NgayTao);
        return dayjs().diff(ngayTao, "day") < 30;
    });
    const uniqueQuyTrinh = new Set(taiLieuMoi.map(record => `${record.TenQuyTrinh}_${record.QuyTrinhVersionId}`));
    const soQuyTrinhKhacNhau = uniqueQuyTrinh.size;
    const totalVersions = lineChartData.reduce((sum, item) => sum + item.count, 0);
    const totalVersionsTL = lineChartDataTL.reduce((sum, item) => sum + item.count, 0);
    const totalVersionsTL_IKEA = lineChartDataTL_IKEA.reduce((sum, item) => sum + item.count, 0);
    return (
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Card title="Thống kê quy trình" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx={140}
                                        cy={120}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ value }) => value}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend layout="vertical" align="right" verticalAlign="middle"
                                    // wrapperStyle={{
                                    //     maxHeight: 150, overflowY: "auto", scrollbarWidth: "thin",
                                    //     scrollbarColor: "#FFFFFF #ffffff"
                                    // }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card title={`Số lượng phiên bản mới: ${totalVersions}`} headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={lineChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => dayjs(date).format("DD/MM")}
                                    />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Card title="Tổng số lượng quy trình" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ color: "#000", textAlign: "center" }}>
                                {data.length}
                            </Typography.Title>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card title="Thống kê sản phẩm DEK" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartDataTL}
                                        cx={140}
                                        cy={120}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ value }) => value}
                                    >
                                        {chartDataTL.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{
                                        maxHeight: 150, overflowY: "auto", scrollbarWidth: "thin",
                                        scrollbarColor: "#FFFFFF #ffffff", width: 200, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card title={`Số lượng phiên bản mới: ${totalVersionsTL}`} headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={lineChartDataTL}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => dayjs(date).format("DD/MM")}
                                    />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Card title="Tổng số lượng tài liệu" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ color: "#000", textAlign: "center" }}>
                                {new Set(dataTL.filter(item => item.KhachHang === "DEK" && item.TaiLieuId).map(item => item.TaiLieuId)).size}
                            </Typography.Title>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card title="Thống kê sản phẩm IKEA" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartDataTL_IKEA}
                                        cx={140}
                                        cy={120}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ value }) => value}
                                    >
                                        {chartDataTL_IKEA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{
                                        maxHeight: 150, overflowY: "auto", scrollbarWidth: "thin",
                                        scrollbarColor: "#FFFFFF #ffffff", width: 200, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card title={`Số lượng phiên bản mới: ${totalVersionsTL_IKEA}`} headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={lineChartDataTL_IKEA}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => dayjs(date).format("DD/MM")}
                                    />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Card title="Tổng số lượng tài liệu" headStyle={{ color: "#000" }} style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ color: "#000", textAlign: "center" }}>
                                {new Set(dataTL.filter(item => item.KhachHang === "IKEA" && item.TaiLieuId).map(item => item.TaiLieuId)).size}
                            </Typography.Title>
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout >
    );
};

export default ChartDasdboard;
