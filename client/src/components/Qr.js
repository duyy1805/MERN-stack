import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Modal, Button, Table, Tag, message, Tooltip, Input, Select, Form, Card } from "antd";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import 'antd/dist/reset.css';
import "./Qr.css";
import apiConfig from '../apiConfig.json'
import * as XLSX from 'xlsx';
import domtoimage from 'dom-to-image';
import { createRoot } from "react-dom/client";
import moment from "moment";
import { PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer } from "recharts";

const API_URL = `${apiConfig.API_BASE_URL}/b2/thietbi`;
const API_ADD_DEVICE = `${apiConfig.API_BASE_URL}/b2/insertthietbi`; // API thêm thiết bị mới
const API_UPDATE_RESULT = `${apiConfig.API_BASE_URL}/b2/capnhatketquakiemtra`; // API cập nhật kết quả kiểm tra
const API_DELETE_DEVICE = `${apiConfig.API_BASE_URL}/b2/deletethietbi`; // API xóa thiết bị

function Qr() {
    const [devices, setDevices] = useState([]);
    const [scannedData, setScannedData] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [showDeviceList, setShowDeviceList] = useState(false);
    const [addDeviceModalVisible, setAddDeviceModalVisible] = useState(false); // Trạng thái modal thêm thiết bị
    const [newDevice, setNewDevice] = useState({ LoaiPhuongTien: "", ViTri: "", TanSuat: "" }); // Thêm tần suất vào state
    const scannerRef = useRef(null);
    const devicesRef = useRef([]);
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const { Option } = Select;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const history = useHistory();


    const exportToExcel = async (devices) => {
        const wb = XLSX.utils.book_new();
        const wsData = [];
        const uniqueDevices = Array.from(new Map(devices.map(d =>
            [`${d.LoaiPhuongTien}-${d.ViTri}`, d]
        )).values());
        for (const device of uniqueDevices) {
            const qrCanvas = document.createElement('canvas');
            const qrCode = document.createElement('div');

            document.body.appendChild(qrCode);
            const root = createRoot(qrCode);
            root.render(<QRCodeCanvas value={generateQRCode(device)} size={64} />);


            const qrImage = await domtoimage.toPng(qrCode);
            document.body.removeChild(qrCode);
            console.log(qrImage);
            wsData.push([
                device.LoaiPhuongTien,
                device.MaThietBi,
                device.ViTri,
                { t: "s", v: qrImage } // Lưu chuỗi base64 trực tiếp, không phải hyperlink
            ]);
            // wsData.push([device.LoaiPhuongTien, device.ViTri, { t: 's', v: '', l: { Target: qrImage } }]);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachThietBi');
        XLSX.writeFile(wb, 'DanhSachThietBi.xlsx');
    };

    const handleLogout = () => {
        localStorage.removeItem('role');
        localStorage.removeItem('accessToken');
        history.push('/B2');
    };

    // Hàm lấy danh sách thiết bị từ API
    const fetchDevices = async () => {
        try {
            const response = await axios.get(API_URL);
            console.log("Danh sách thiết bị:", response.data);
            setDevices(response.data);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu từ API:", error);
            // message.error("Không thể tải danh sách thiết bị");
            messageApi.open({ // Corrected message API usage
                type: 'error',
                content: `Không thể tải danh sách thiết bị`,
            });
        }
    };

    // Gọi API khi component mount
    useEffect(() => {
        fetchDevices();
    }, []);

    // Cập nhật devices mới nhất vào ref
    useEffect(() => {
        devicesRef.current = devices;
    }, [devices]);

    // Chỉ khởi tạo scanner 1 lần
    useEffect(() => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(
                (decodedText) => {
                    console.log("QR Code Scanned:", decodedText);
                    setScannedData(decodedText);

                    const maThietBi = decodedText.trim();
                    const latestDevices = devicesRef.current;

                    const deviceList = latestDevices.filter(d => d.MaThietBi === maThietBi);

                    if (deviceList.length > 0) {
                        setSelectedDevice(deviceList);
                        setModalVisible(true);
                    } else {
                        messageApi.open({
                            type: 'warning',
                            content: `Thiết bị không tồn tại trong danh sách.`,
                        });
                    }
                },
                (errorMessage) => {
                    console.warn("QR Scan Error:", errorMessage);
                }
            );
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.error(e));
                scannerRef.current = null;
            }
        };
    }, []);

    const deviceTypes = [
        "Tủ báo cháy trung tâm",
        "Bơm chữa cháy",
        "Đường ống cứu hỏa",
        "Bình CO2",
        "Bình bột MFZ",
        "Họng nước cứu hỏa vách tường",
        "Dây vòi, lăng phun",
        "Trụ cấp nước bên ngoài",
        "Đèn chiếu sáng sự cố (EXIT)",
        "Đèn chiếu sáng sự cố (Mắt ếch)",
        "Chuông báo cháy",
        "Quả cầu chữa cháy",
    ];
    const generateQRCode = (device) => {
        return device.MaThietBi;
    };

    const updateTestResult = async (IDNoiDungKiemTra, KetQua) => {
        try {
            await axios.post(API_UPDATE_RESULT, { IDNoiDungKiemTra, KetQua });
            messageApi.open({
                type: 'success',
                content: `Cập nhật kết quả thành công`,
            });
            // Gọi lại API để cập nhật dữ liệu mới
            fetchDevices();

        } catch (error) {
            console.error("Lỗi khi cập nhật kết quả:", error);
            messageApi.open({
                type: 'error',
                content: `Không thể cập nhật kết quả kiểm tra.`,
            });
        }
    };

    // Hàm xóa thiết bị
    const handleDeleteDevice = async (IDThietBi) => {
        try {
            console.log(IDThietBi);
            await axios.post(API_DELETE_DEVICE, { IDThietBi });
            messageApi.open({
                type: 'success',
                content: `Xóa thiết bị thành công`,
            });
            // Gọi lại API để cập nhật danh sách thiết bị
            fetchDevices();
        } catch (error) {
            console.error("Lỗi khi xóa thiết bị:", error);
            messageApi.open({
                type: 'error',
                content: `Không thể xóa thiết bị.`,
            });
        }
    };

    // Cột bảng hiển thị nội dung kiểm tra
    const columns = [
        {
            title: (
                <Tooltip title="Nội dung kiểm tra thiết bị">
                    <div style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 100, // Điều chỉnh độ rộng tối đa
                    }}>
                        Nội Dung Kiểm Tra
                    </div>
                </Tooltip>
            ),
            dataIndex: "NoiDungKiemTra",
            key: "NoiDungKiemTra",
            width: "15%",
            render: (text) => <Tooltip placement="topLeft" title={text}>{text}</Tooltip>,
        },
        {
            title: (
                <Tooltip title="Kết quả kiểm tra thiết bị">
                    Kết Quả
                </Tooltip>
            ),
            dataIndex: "KetQua",
            key: "KetQua",
            width: "10%",
            render: (text) => (
                text ? <Tag color={text === "Đạt" ? "green" : text === 'Không đạt' ? 'red' : "yellow"}>{text}</Tag> : <Tag color="gray">Chưa kiểm tra</Tag>
            )
        },
        {
            title: (
                <Tooltip title="Các thao tác đánh giá kết quả">
                    Thao Tác
                </Tooltip>
            ),
            key: "action",
            render: (text, record) => (
                <div>
                    <Button
                        type="primary"
                        onClick={() => {
                            updateTestResult(record.IDNoiDungKiemTra, "Đạt");
                            const updatedDevice = selectedDevice.map(d =>
                                d.NoiDungKiemTra === record.NoiDungKiemTra
                                    ? { ...d, KetQua: "Đạt", ThoiGianKiemTra: moment().format("YYYY-MM-DD HH:mm:ss"), SoLanKiemTraDat: d.SoLanKiemTraDat + 1 }
                                    : d
                            );
                            setSelectedDevice(updatedDevice);
                        }}
                    >
                        Đạt
                    </Button>
                    <Button
                        type="primary"
                        danger ghost
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                            updateTestResult(record.IDNoiDungKiemTra, "Không đạt");
                            const updatedDevice = selectedDevice.map(d =>
                                d.NoiDungKiemTra === record.NoiDungKiemTra
                                    ? { ...d, KetQua: "Không đạt", ThoiGianKiemTra: moment().format("YYYY-MM-DD HH:mm:ss") }
                                    : d
                            );
                            setSelectedDevice(updatedDevice);
                        }}
                    >
                        Không đạt
                    </Button>
                </div>
            )
        },
        {
            title: (
                <Tooltip title="Hướng dẫn kiểm tra thiết bị">
                    <div style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 100, // Điều chỉnh độ rộng tối đa
                    }}>
                        Hướng dẫn kiểm tra
                    </div>
                </Tooltip>
            ),
            dataIndex: "HuongDanKiemTra",
            key: "HuongDanKiemTra",
            width: "15%",
            render: (text) => <Tooltip placement="topLeft" title={text}>{text}</Tooltip>,
        },
        {
            title: (
                <Tooltip title="Số lần kiểm tra đạt trong tháng">
                    <span style={{ display: "inline-block", whiteSpace: "nowrap", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Số lần đạt
                    </span>
                </Tooltip>
            ),
            dataIndex: "SoLanKiemTraDat",
            key: "SoLanKiemTraDat",
            align: "center",
            render: (text) => <Tooltip placement="topLeft" title={text}>{text}</Tooltip>,
        },
        {
            title: (
                <Tooltip title="Thời gian kiểm tra gần nhất">
                    Thời Gian Kiểm Tra
                </Tooltip>
            ),
            dataIndex: "ThoiGianKiemTra",
            key: "ThoiGianKiemTra",
            render: (text) =>
                text
                    ? moment(text).format("YYYY-MM-DD HH:mm:ss")
                    : "-"
        },
    ];

    // Tạo bộ lọc cho cột Loại Phương Tiện
    const createFilters = (key) => {
        const uniqueValues = [...new Set(devices.map((item) => item[key]))];
        return uniqueValues.map((value) => ({
            text: value,
            value,
        }));
    };

    const LPTFilters = createFilters('LoaiPhuongTien');
    const columns_ = [
        {
            title: "Loại Phương Tiện",
            dataIndex: "LoaiPhuongTien",
            key: "LoaiPhuongTien",
            filters: LPTFilters,
            filterSearch: true,
            onFilter: (value, record) => record.LoaiPhuongTien.includes(value),
            ellipsis: { showTitle: false },
            render: (text) => <Tooltip placement="topLeft" title={text}>{text}</Tooltip>,
        },
        {
            title: "Mã thiết bị",
            dataIndex: "MaThietBi",
            key: "MaThietBi",
        },
        {
            title: "Vị Trí",
            dataIndex: "ViTri",
            key: "ViTri",
            render: (text) => text || "Không xác định",
        },
        {
            title: "Trạng thái",
            dataIndex: "TrangThai",
            key: "TrangThai",
            filters: [
                { text: "Đạt", value: "Đạt" },
                { text: "Không đạt", value: "Không đạt" },
                { text: "Chờ xử lý", value: "Chờ xử lý" },
            ],
            onFilter: (value, record) => record.TrangThai === value,
            sorter: (a, b) => {
                const order = ["Chờ xử lý", "Không đạt", "Đạt"];
                return order.indexOf(a.TrangThai) - order.indexOf(b.TrangThai);
            },
            render: (text) => {
                let color = text === "Đạt" ? "green" : text === "Chờ xử lý" ? "orange" : "red";
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: "QR Code",
            dataIndex: "QRCode",
            key: "QRCode",
            align: "center",
            render: (_, record) => <QRCodeCanvas value={generateQRCode(record)} size={64} />,
        },
        {
            title: "Hành động",
            key: "action",
            align: "center",
            render: (_, record) => (
                <Button type="primary" danger onClick={() => handleDeleteDevice(record.IDThietBi)}>
                    Xóa
                </Button>
            ),
        },
    ];

    const getTrangThaiThietBi = (IDThietBi) => {
        const items = devices.filter(d => d.IDThietBi === IDThietBi);
        const allPending = items.every(d => d.KetQua === "Chờ xử lý");
        const hasFailed = items.some(d => d.KetQua === "Không đạt");

        if (hasFailed) return "Không đạt";
        if (allPending) return "Chờ xử lý";
        return "Đạt";
    };


    // Xử lý submit Form để thêm thiết bị
    const onFinish = async (values) => {
        try {
            await axios.post(API_ADD_DEVICE, values);
            messageApi.open({
                type: 'success',
                content: `Thêm thiết bị thành công`,
            });
            fetchDevices();
            setAddDeviceModalVisible(false);
            form.resetFields();
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: `Không thể thêm thiết bị.`,
            });
        }
    }
    const getDevicesSummary = () => {
        const summary = devices.reduce((acc, item) => {
            const { IDThietBi, KetQua } = item;

            if (!acc[IDThietBi]) {
                acc[IDThietBi] = { IDThietBi, KetQua: "Đạt" };
            }

            if (KetQua === "Chờ xử lý" || KetQua === "Không đạt") {
                acc[IDThietBi].KetQua = "Không đạt";
            }

            const items = devices.filter(d => d.IDThietBi === IDThietBi);
            const allPending = items.every(d => d.KetQua === "Chờ xử lý");
            const hasFailed = items.some(d => d.KetQua === "Không đạt");

            if (hasFailed) acc[IDThietBi].KetQua = "Không đạt";
            else if (allPending) acc[IDThietBi].KetQua = "Chờ xử lý";
            else acc[IDThietBi].KetQua = "Đạt";

            return acc;
        }, {});

        const counts = { Dat: 0, KhongDat: 0, ChoXuLy: 0 };

        Object.values(summary).forEach(({ KetQua }) => {
            if (KetQua === "Đạt") counts.Dat++;
            else if (KetQua === "Không đạt") counts.KhongDat++;
            else if (KetQua === "Chờ xử lý") counts.ChoXuLy++;
        });

        return counts;
    };
    console.log(getDevicesSummary())
    const PieChartComponent = () => {
        const counts = getDevicesSummary();

        const data = [
            { name: "Đạt", value: counts.Dat },
            { name: "Không đạt", value: counts.KhongDat },
            { name: "Chờ xử lý", value: counts.ChoXuLy },
        ];

        const COLORS = ["#28a745", "#dc3545", "#ffc107"];

        return (
            <ResponsiveContainer width={400} height={300}>
                <PieChart >
                    <Pie data={data} cx="50%" cy="50%" outerRadius={100} label={({ value }) => value} paddingAngle={5} dataKey="value">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                    </Pie>
                    <RechartTooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
            </ResponsiveContainer>
        );
    };
    return (
        <div className="Qr">
            {contextHolder}
            <h1>Kiểm Tra Thiết Bị</h1>

            {/* Quét QR Code */}
            <div className="qr-reader">
                <h2>Quét QR Code</h2>
                <div id="qr-reader" style={{ width: "100%" }}></div>
            </div>

            {/* Nút hiển thị danh sách thiết bị */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <Button type="primary" onClick={() => setShowDeviceList(true)}>
                    Hiển Thị Danh Sách Thiết Bị
                </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                    Thống kê kiểm tra
                </Button>
            </div>
            <Modal
                title="Thống kê kiểm tra thiết bị"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={500}
            >
                <PieChartComponent />
            </Modal>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <Button color="primary" variant="filled" onClick={handleLogout}>
                    Sign out
                </Button>
            </div>
            {/* <p onClick={handleLogout} style={{ cursor: 'pointer', color: 'blue' }}>Đăng xuất</p> */}

            {/* Modal hiển thị danh sách thiết bị */}
            <Modal
                title="Danh Sách Thiết Bị"
                open={showDeviceList}
                onCancel={() => setShowDeviceList(false)}
                width={window.innerWidth < 768 ? "100%" : "70%"}
                footer={[
                    <Button key="export" onClick={() => exportToExcel(devices)}>
                        Xuất Excel
                    </Button>,
                    <Button key="close" onClick={() => setShowDeviceList(false)}>Đóng</Button>,
                    <Button key="addDevice" type="primary" onClick={() => setAddDeviceModalVisible(true)}>
                        Thêm Thiết Bị
                    </Button>
                ]}
            >
                <div style={{ overflowX: 'auto', }}>
                    <Table
                        dataSource={Array.from(new Set(devices.map(d => d.MaThietBi))).map((MaThietBi) => {
                            const deviceGroup = devices.find(d => d.MaThietBi === MaThietBi);
                            return {
                                key: MaThietBi,
                                IDThietBi: deviceGroup?.IDThietBi,
                                MaThietBi: MaThietBi,
                                LoaiPhuongTien: deviceGroup?.LoaiPhuongTien,
                                ViTri: deviceGroup?.ViTri,
                                TrangThai: getTrangThaiThietBi(deviceGroup?.IDThietBi),
                                QRCode: deviceGroup
                            };
                        })}
                        // style={{ width: 1000 }}
                        columns={columns_}
                        pagination={false}
                        scroll={{ x: 1000, y: 500 }}
                    />
                </div>
            </Modal>

            <Modal
                title="Thêm Thiết Bị"
                open={addDeviceModalVisible}
                onCancel={() => {
                    setAddDeviceModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        LoaiPhuongTien: "",
                        ViTri: "",
                        TanSuat: ""
                    }}
                >
                    <Form.Item
                        label="Loại Phương Tiện"
                        name="LoaiPhuongTien"
                        rules={[{ required: true, message: "Vui lòng chọn loại phương tiện" }]}
                    >
                        <Select placeholder="Chọn loại phương tiện">
                            {deviceTypes.map((type) => (
                                <Option key={type} value={type}>
                                    {type}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Vị Trí"
                        name="ViTri"
                        rules={[{ required: true, message: "Vui lòng nhập vị trí" }]}
                    >
                        <Input placeholder="Nhập vị trí" />
                    </Form.Item>

                    <Form.Item
                        label="Tần Suất"
                        name="TanSuatKiemTra"
                        rules={[{ required: true, message: "Vui lòng nhập tần suất" }]}
                    >
                        <Input placeholder="Nhập tần suất" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
                            Thêm
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>


            {/* Modal hiển thị nội dung kiểm tra thiết bị */}
            <Modal
                title="Thông Tin Kiểm Tra"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                width={window.innerWidth < 768 ? "100%" : "60%"}
                footer={[<Button key="close" onClick={() => setModalVisible(false)}>Đóng</Button>]}
            >
                {selectedDevice && (
                    <div style={{ overflowX: 'auto' }}>
                        <h3>{selectedDevice[0]?.LoaiPhuongTien} - {selectedDevice[0]?.ViTri}</h3>
                        <Table
                            dataSource={selectedDevice}
                            columns={columns}
                            rowKey="NoiDungKiemTra"
                            pagination={false}
                            scroll={{ x: 1000, y: 500 }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Qr;
