import React, { useEffect, useState } from "react";
import { Card, Button, Layout, Row, Col, Carousel, Table } from "antd";
import io from "socket.io-client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine, } from "recharts";
import styles from './QLCM.module.css'
import axios from 'axios'
const { Header, Sider, Content } = Layout;

const API_URL = 'https://apipccc.z76.vn'
const COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28'];
const CNPN_CM2 = () => {
    const [totalCount, setTotalCount] = useState(0);
    const [currentTarget, setCurrentTarget] = useState(0);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [productName, setProductName] = useState("Sản phẩm");
    const [plan, setPlan] = useState()
    const [dsLoi, setDsLoi] = useState([]);

    const socket = io("http://27.71.231.202:3500");
    useEffect(() => {
        if (!dailyTarget) return; // Nếu dailyTarget chưa có dữ liệu thì không cần tính

        const updateCurrentTarget = () => {
            const now = new Date();
            const startTime1 = new Date();
            startTime1.setHours(7, 30, 0, 0);
            const endTime1 = new Date();
            endTime1.setHours(11, 30, 0, 0);
            const startTime2 = new Date();
            startTime2.setHours(12, 30, 0, 0);
            const endTime2 = new Date();
            endTime2.setHours(16, 30, 0, 0);

            let totalMinutes = 0;

            if (now < startTime1) {
                totalMinutes = 0; // Chưa vào ca
            } else if (now >= startTime1 && now <= endTime1) {
                totalMinutes = (now - startTime1) / 60000; // Chuyển ms -> phút
            } else if (now > endTime1 && now < startTime2) {
                totalMinutes = (endTime1 - startTime1) / 60000; // Giữ nguyên kết quả ca sáng
            } else if (now >= startTime2 && now <= endTime2) {
                totalMinutes = (endTime1 - startTime1) / 60000;
                totalMinutes += (now - startTime2) / 60000;
            } else if (now > endTime2) {
                totalMinutes = 480; // Kết thúc ca
            }

            const newCurrentTarget = Math.min(
                Math.floor((dailyTarget / 480) * totalMinutes),
                dailyTarget
            );

            setCurrentTarget(newCurrentTarget);
        };

        updateCurrentTarget();
        const interval = setInterval(updateCurrentTarget, 60000); // Cập nhật mỗi phút

        return () => clearInterval(interval); // Cleanup interval khi component unmount
    }, [dailyTarget]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/TAG_QLSX/getloi-theokehoach`, {
                    params: {
                        idKeHoach: plan.code
                    }
                });
                console.log(response.data)
                setDsLoi(response.data);
            } catch (error) {
                console.error('Lỗi khi gọi API:', error);
            }
        };

        fetchData();
    }, [plan]);
    useEffect(() => {
        socket.on("updateCount_2", (data) => {
            console.log(data?.counts);

            if (!data?.counts || Object.keys(data.counts).length === 0) {
                return; // Thoát sớm nếu counts không tồn tại hoặc rỗng
            }

            const firstKey = Object.keys(data.counts)[0]; // Lấy mã sản phẩm đầu tiên
            if (!firstKey) return; // Tránh lỗi nếu firstKey là undefined

            const countInfo = data.counts[firstKey];
            console.log(countInfo);

            if (countInfo) {
                setProductName(countInfo.label);
                setTotalCount(countInfo.count);
                setDailyTarget(countInfo.dailyTarget);
                setChartData(countInfo.dataChart || []);
                setPlan(countInfo)
            }
        });

        return () => socket.off("updateCount_2");
    }, []);

    const LoiTableHorizontal = ({ dsLoi }) => {
        // Tạo một hàng duy nhất, key là TenLoi, value là TongSoLuong
        const rowData = dsLoi.reduce((acc, item) => {
            acc[item.TenLoi] = item.TongSoLuong;
            return acc;
        }, { key: 'row1' });

        // Tạo cột động từ TenLoi
        const columns = dsLoi.map(item => ({
            title: item.TenLoi,
            dataIndex: item.TenLoi,
            key: item.TenLoi,
            align: 'center',
        }));

        return (
            <Table
                columns={columns}
                dataSource={[rowData]} // chỉ có 1 hàng
                pagination={false}
                bordered
            />
        );
    };
    return (
        <Layout style={{ height: "100vh" }}>
            <Carousel autoplay autoplaySpeed={10000}>
                <div>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={24} md={24} lg={24} style={{ height: "calc(100vh - 200px)" }}>
                            <Header
                                style={{
                                    padding: 0,
                                    background: "#ffffff",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    // height: "30px",
                                    fontSize: "36px",
                                    fontWeight: "bold",
                                    color: "#1677ff",
                                    boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)", // Hiệu ứng nổi bật
                                }}
                            >
                                {productName}
                            </Header>
                            <Content>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={12} md={8} lg={8}>
                                        <Card title="Mục tiêu trong ngày" className={styles.centeredCard}>
                                            <h2>{dailyTarget}</h2>
                                        </Card>
                                    </Col>
                                    <Col xs={24} sm={12} md={8} lg={8}>
                                        <Card title="Mục tiêu hiện tại" className={styles.centeredCard}>
                                            <h2>{currentTarget}</h2>
                                        </Card>
                                    </Col>
                                    <Col xs={24} sm={12} md={8} lg={8}>
                                        <Card title="Sản xuất hiện tại" className={styles.centeredCard}>
                                            <h2>{totalCount}</h2>
                                        </Card>
                                    </Col>
                                </Row>
                                <Card title="Sản lượng theo giờ" className={styles.centeredCard} style={{ height: "calc(100vh - 150px)" }}>
                                    <ResponsiveContainer width="100%" height={750}>
                                        <BarChart data={chartData} margin={{ top: 15 }}>
                                            <XAxis dataKey="Time" />
                                            <YAxis hide /> {/* Ẩn trục Y */}
                                            <Tooltip />
                                            <Legend />
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <ReferenceLine y={0} stroke="#000" />
                                            <Bar dataKey="Value" fill="#1677ff" label={{ position: "top", fill: "#000", fontSize: 14 }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Content>
                        </Col>
                    </Row>
                </div>
                <div >
                    <Card title="Số lượng lỗi trong ngày">
                        <ResponsiveContainer width="80%" height={600} >
                            <PieChart>
                                <Pie
                                    data={dsLoi}
                                    dataKey="TongSoLuong"
                                    nameKey="TenLoi"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={200}
                                    label
                                >
                                    {dsLoi.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 32 }}>
                            <LoiTableHorizontal dsLoi={dsLoi} />
                        </div>
                    </Card>
                </div>
            </Carousel>
        </Layout >
    );
};

export default CNPN_CM2;
