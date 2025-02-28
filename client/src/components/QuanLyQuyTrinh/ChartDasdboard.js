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
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const ChartDasdboard = () => {
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
    const [chartData, setChartData] = useState([]);
    const [lineChartData, setLineChartData] = useState([]);

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
            const formattedData = Object.values(groupedData);
            setChartData(formattedData);
            setAllProcessNames(names);
        } catch (error) {
            message.error('Lỗi khi lấy dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
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

    const taiLieuMoi = allData.filter(record => {
        if (!record.NgayTao) return false;
        const ngayTao = dayjs(record.NgayTao);
        return dayjs().diff(ngayTao, "day") < 30;
    });
    const uniqueQuyTrinh = new Set(taiLieuMoi.map(record => `${record.TenQuyTrinh}_${record.QuyTrinhVersionId}`));
    const soQuyTrinhKhacNhau = uniqueQuyTrinh.size;
    const totalVersions = lineChartData.reduce((sum, item) => sum + item.count, 0);
    return (
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#162f48' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card title="Thống kê quy trình" headStyle={{ color: "#fff" }} style={{ backgroundColor: '#001529', border: 'none', marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx={100}
                                        cy={100}
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
                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card title={`Số lượng phiên bản mới: ${totalVersions}`} headStyle={{ color: "#fff" }} style={{ backgroundColor: '#001529', border: 'none', marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={200}>
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
                    <Col xs={24} sm={8}>
                        <Card title="Tổng số lượng quy trình" headStyle={{ color: "#fff" }} style={{ backgroundColor: '#001529', border: 'none', marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ color: "#fff", textAlign: "center" }}>
                                {data.length}
                            </Typography.Title>
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout >
    );
};

export default ChartDasdboard;
