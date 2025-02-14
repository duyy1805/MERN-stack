import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Modal, Button, Table, Tag, message, Tooltip, Input, Select, Form } from "antd";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import 'antd/dist/reset.css';
import "./Qr.css";
import apiConfig from '../apiConfig.json'
import * as XLSX from 'xlsx';
import domtoimage from 'dom-to-image';
import { createRoot } from "react-dom/client";

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

    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const { Option } = Select;

    const history = useHistory();


    const exportToExcel = async (devices) => {
        const wb = XLSX.utils.book_new();
        const wsData = [];

        for (const device of devices) {
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
        history.push('/');
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

    // Chỉ khởi tạo scanner khi devices đã có dữ liệu
    useEffect(() => {
        if (devices.length > 0 && !scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(
                (decodedText) => {
                    console.log("QR Code Scanned:", decodedText);
                    setScannedData(decodedText);

                    try {
                        const scannedDevice = JSON.parse(decodedText);
                        console.log("Scanned Device:", scannedDevice);

                        // Tìm thiết bị trong danh sách
                        const deviceList = devices.filter(d => d.MaThietBi === scannedDevice.MaThietBi);
                        console.log(devices);
                        if (deviceList.length > 0) {
                            setSelectedDevice(deviceList);
                            setModalVisible(true);
                        } else {
                            messageApi.open({ // Corrected message API usage
                                type: 'warning',
                                content: `Thiết bị không tồn tại trong danh sách.`,
                            });
                        }
                    } catch (error) {
                        messageApi.open({ // Corrected message API usage
                            type: 'error',
                            content: `QR Code không hợp lệ!`,
                        });
                    }
                },
                (error) => {
                    console.error("Không thể quét QR Code:");
                    // messageApi.open({ // Corrected message API usage
                    //     type: 'error',
                    //     content: `Không thể quét QR Code`,
                    // });
                }
            );
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        };
    }, [devices]); // Chỉ chạy khi `devices` thay đổi

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
    // Tạo nội dung QR Code
    const generateQRCode = (device) => {
        return JSON.stringify({ MaThietBi: device.MaThietBi, LoaiPhuongTien: device.LoaiPhuongTien });
    };

    // Hàm cập nhật kết quả kiểm tra
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
            title: "Nội Dung Kiểm Tra",
            dataIndex: "NoiDungKiemTra",
            key: "NoiDungKiemTra",
        },
        {
            title: "Kết Quả",
            dataIndex: "KetQua",
            key: "KetQua",
            render: (text) => (
                text ? <Tag color={text === "Đạt" ? "green" : "red"}>{text}</Tag> : <Tag color="gray">Chưa kiểm tra</Tag>
            )
        },
        {
            title: "Số lần kiểm tra đạt trong tháng",
            dataIndex: "SoLanKiemTraDat",
            key: "SoLanKiemTraDat",
            align: "center",
        },
        {
            title: "Thời Gian Kiểm Tra",
            dataIndex: "ThoiGianKiemTra",
            key: "ThoiGianKiemTra",
            render: (text) =>
                text
                    ? new Date(text).toISOString().replace("T", " ").replace("Z", "").split(".")[0]
                    : "-"
        },
        {
            title: "Thao Tác",
            key: "action",
            render: (text, record) => (
                <div>
                    <Button
                        type="primary"
                        onClick={() => {
                            updateTestResult(record.IDNoiDungKiemTra, "Đạt");
                            // Cập nhật lại kết quả và thời gian trong bảng
                            const updatedDevice = selectedDevice.map(d =>
                                d.NoiDungKiemTra === record.NoiDungKiemTra
                                    ? { ...d, KetQua: "Đạt", ThoiGianKiemTra: new Date().toISOString().replace("T", " ").replace("Z", "").split(".")[0] }
                                    : d
                            );
                            setSelectedDevice(updatedDevice);
                        }}
                    // disabled={record.KetQua === "Đạt"}
                    >
                        Đạt
                    </Button>
                    <Button
                        type="primary"
                        danger ghost
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                            updateTestResult(record.IDNoiDungKiemTra, "Không đạt");
                            // Cập nhật lại kết quả và thời gian trong bảng
                            const updatedDevice = selectedDevice.map(d =>
                                d.NoiDungKiemTra === record.NoiDungKiemTra
                                    ? { ...d, KetQua: "Không đạt", ThoiGianKiemTra: new Date().toISOString().replace("T", " ").replace("Z", "").split(".")[0] }
                                    : d
                            );
                            setSelectedDevice(updatedDevice);
                        }}
                    // disabled={record.KetQua === "Không đạt"}
                    >
                        Không đạt
                    </Button>
                </div>
            )
        }
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
            title: "Vị Trí",
            dataIndex: "ViTri",
            key: "ViTri",
            render: (text) => text || "Không xác định",
        },
        {
            title: "QR Code",
            dataIndex: "QRCode",
            key: "QRCode",
            render: (_, record) => <QRCodeCanvas value={generateQRCode(record)} size={64} />,
        },
        {
            title: "Hành động",
            key: "action",
            render: (_, record) => (
                <Button
                    type="primary"
                    danger
                    onClick={() => handleDeleteDevice(record.IDThietBi)}
                >
                    Xóa
                </Button>
            ),
        },
    ];

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
    };
    // const handleAddDevice = async () => {
    //     try {
    //         const response = await axios.post(API_ADD_DEVICE, newDevice);
    //         message.success("Thêm thiết bị thành công!");
    //         fetchDevices();  // Gọi lại API để cập nhật danh sách thiết bị
    //         setAddDeviceModalVisible(false);  // Đóng modal thêm thiết bị
    //         setNewDevice({ LoaiPhuongTien: "", ViTri: "", TanSuat: "" }); // Reset form
    //     } catch (error) {
    //         console.error("Lỗi khi thêm thiết bị:", error);
    //         message.error("Không thể thêm thiết bị.");
    //     }
    // };

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
                {/* <div style={{ overflowX: 'auto', }}> */}
                <Table
                    dataSource={Array.from(new Set(devices.map(d => d.MaThietBi))).map((MaThietBi) => {
                        const deviceGroup = devices.find(d => d.MaThietBi === MaThietBi);
                        return {
                            key: MaThietBi,
                            IDThietBi: deviceGroup?.IDThietBi,
                            MaThietBi: MaThietBi,
                            LoaiPhuongTien: deviceGroup?.LoaiPhuongTien,
                            ViTri: deviceGroup?.ViTri,
                            QRCode: deviceGroup
                        };
                    })}
                    columns={columns_}
                    pagination={false}
                    scroll={{ x: 'max-content', y: 500 }}
                />
                {/* </div> */}
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
                        name="TanSuat"
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
                width={window.innerWidth < 768 ? "90%" : "60%"} // 90% màn hình trên mobile
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
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Qr;
