import React, { useEffect, useState } from "react";
import { Card, Button, Layout, Row, Col } from "antd";
import io from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine, } from "recharts";
import styles from './QLCM.module.css'
const { Header, Sider, Content } = Layout;


const CNPN_CM1 = () => {
    const [totalCount, setTotalCount] = useState(0);
    const [currentTarget, setCurrentTarget] = useState(0);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [productName, setProductName] = useState("Sản phẩm");

    const [totalCount_PLP_1, setTotalCount_PLP_1] = useState(0);
    const [currentTarget_PLP_1, setCurrentTarget_PLP_1] = useState(0);
    const [dailyTarget_PLP_1, setDailyTarget_PLP_1] = useState(0);
    const [chartData_PLP_1, setChartData_PLP_1] = useState([]);
    const [productName_PLP_1, setProductName_PLP_1] = useState("Sản phẩm");
    const socket = io("http://localhost:3500");
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
        if (!dailyTarget_PLP_1) return; // Nếu dailyTarget chưa có dữ liệu thì không cần tính

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
                Math.floor((dailyTarget_PLP_1 / 480) * totalMinutes),
                dailyTarget
            );

            setCurrentTarget_PLP_1(newCurrentTarget);
        };

        updateCurrentTarget();
        const interval = setInterval(updateCurrentTarget, 60000); // Cập nhật mỗi phút

        return () => clearInterval(interval); // Cleanup interval khi component unmount
    }, [dailyTarget_PLP_1]);
    useEffect(() => {
        socket.on("updateCount", (data) => {
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
            }
        });
        socket.on("updateCount_PLP_1", (data) => {
            console.log(data?.counts);

            if (!data?.counts || Object.keys(data.counts).length === 0) {
                return; // Thoát sớm nếu counts không tồn tại hoặc rỗng
            }

            const firstKey = Object.keys(data.counts)[0]; // Lấy mã sản phẩm đầu tiên
            if (!firstKey) return; // Tránh lỗi nếu firstKey là undefined

            const countInfo = data.counts[firstKey];
            console.log(countInfo);

            if (countInfo) {
                setProductName_PLP_1(countInfo.label);
                setTotalCount_PLP_1(countInfo.count);
                setDailyTarget_PLP_1(countInfo.dailyTarget);
                setChartData_PLP_1(countInfo.dataChart || []);
            }
        });

        return () => socket.off("updateCount");
    }, []);

    const increaseCount = () => {
        socket.emit("increment", { count: totalCount + 1 });
    };

    return (
        <Layout >
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={12} lg={12} style={{ height: "50vh" }}>
                    <Header
                        style={{
                            padding: 0,
                            background: "#ffffff",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "30px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#8884d8",
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
                        <Card title="Sản lượng theo giờ" className={styles.centeredCard} >
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 15 }}>
                                    <XAxis dataKey="Time" />
                                    <YAxis hide /> {/* Ẩn trục Y */}
                                    <Tooltip />
                                    <Legend />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <ReferenceLine y={0} stroke="#000" />
                                    <Bar dataKey="Value" fill="#8884d8" label={{ position: "top", fill: "#000", fontSize: 14 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Content>
                </Col>
                <Col xs={24} sm={12} md={12} lg={12} style={{ height: "50vh" }}>
                    <Header
                        style={{
                            padding: 0,
                            background: "#ffffff",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "30px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#8884d8",
                            boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)", // Hiệu ứng nổi bật
                        }}
                    >
                        {productName_PLP_1}
                    </Header>
                    <Content>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8} lg={8}>
                                <Card title="Mục tiêu trong ngày" className={styles.centeredCard}>
                                    <h2>{dailyTarget_PLP_1}</h2>
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={8}>
                                <Card title="Mục tiêu hiện tại" className={styles.centeredCard}>
                                    <h2>{currentTarget_PLP_1}</h2>
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={8}>
                                <Card title="Sản xuất hiện tại" className={styles.centeredCard}>
                                    <h2>{totalCount_PLP_1}</h2>
                                </Card>
                            </Col>
                        </Row>
                        <Card title="Sản lượng theo giờ" className={styles.centeredCard} >
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData_PLP_1} margin={{ top: 15 }}>
                                    <XAxis dataKey="Time" />
                                    <YAxis hide /> {/* Ẩn trục Y */}
                                    <Tooltip />
                                    <Legend />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <ReferenceLine y={0} stroke="#000" />
                                    <Bar dataKey="Value" fill="#8884d8" label={{ position: "top", fill: "#000", fontSize: 14 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Content>
                </Col>
            </Row>
        </Layout >
    );
};

export default CNPN_CM1;
