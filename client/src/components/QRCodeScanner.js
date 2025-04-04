import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Select, message } from "antd";
import { Button, Modal, Table } from "antd";
import axios from "axios";
import apiConfig from '../apiConfig.json';

export default function QRCodeScanner() {
    const [selectedArea, setSelectedArea] = useState(null); // Lưu khu vực đã chọn
    const scannedRef = useRef(false);
    const scannerRef = useRef(null);
    const selectedAreaRef = useRef(null); // Dùng để lưu giá trị khu vực mới nhất
    const [messageApi, contextHolder] = message.useMessage();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pallets, setPallets] = useState([]);

    const columns = [
        { title: "Khu vực", dataIndex: "area", key: "area" },
        { title: "Pallet Nhựa", dataIndex: "plastic", key: "plastic" },
        { title: "Pallet Sắt", dataIndex: "iron", key: "iron" },
        { title: "Pallet Gỗ", dataIndex: "wood", key: "wood" },
    ];
    useEffect(() => {
        axios.get(`${apiConfig.API_BASE_URL}/B2/getpalletcount`)
            .then((res) => {
                const sortOrder = ["Khu A", "Khu B", "Khu C", "Nhà thầu"];

                // Chuyển đổi dữ liệu từ hàng thành cột
                const transformedData = sortOrder.map(area => {
                    const areaPallets = res.data.filter(item => item.ZoneName === area);
                    return {
                        key: area,
                        area,
                        plastic: areaPallets.find(p => p.TypeName === "Nhựa")?.PalletCount || 0,
                        iron: areaPallets.find(p => p.TypeName === "Sắt")?.PalletCount || 0,
                        wood: areaPallets.find(p => p.TypeName === "Gỗ")?.PalletCount || 0,
                    };
                });
                console.log("Dữ liệu đã chuyển:", transformedData);
                setPallets(transformedData);
            })
            .catch((err) => console.error("Lỗi API:", err));
    }, []);

    useEffect(() => {
        selectedAreaRef.current = selectedArea; // Cập nhật giá trị mới mỗi lần thay đổi
    }, [selectedArea]); // Chạy lại khi `selectedArea` thay đổi

    useEffect(() => {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        const startScanning = async () => {
            if (scanner.isScanning) return;
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => handleBarCodeScanned(decodedText),
                    (errorMessage) => console.log("Lỗi quét:", errorMessage)
                );
            } catch (err) {
                console.error("Lỗi khởi chạy scanner:", err);
            }
        };

        startScanning();

        return () => {
            if (scanner.isScanning) {
                scanner.stop().catch(() => { });
            }
        };
    }, []);

    const handleBarCodeScanned = async (data) => {
        if (scannedRef.current) return; // Chặn quét liên tục
        scannedRef.current = true;

        if (!selectedAreaRef.current) {
            messageApi.warning("⚠ Vui lòng chọn khu vực trước khi quét!", 1.5);
            scannedRef.current = false; // Cho phép quét lại
            return;
        }

        try {
            const qrObject = JSON.parse(data);
            qrObject.ZoneId = selectedAreaRef.current; // Thêm khu vực

            // Xác định loại pallet
            const prefix = qrObject.PalletCode.substring(0, 3); // Lấy 3 ký tự đầu
            const palletTypeMap = { PLN: 1, PLS: 2, PLG: 3 };
            qrObject.PalletTypeId = palletTypeMap[prefix] || null; // Gán loại pallet

            messageApi.success(
                `📦 Mã: ${qrObject.PalletCode} - 📍 Khu: ${qrObject.ZoneId} - 🏷 Loại: ${qrObject.PalletTypeId || "Không xác định"}`,
                2
            );
            const response = await axios.post(`${apiConfig.API_BASE_URL}/B2/insertpallet`, {
                PalletCode: qrObject.PalletCode,
                ZoneId: qrObject.ZoneId,
                PalletTypeId: qrObject.PalletTypeId,
            });
            if (response.status === 200) {
                messageApi.success("✔ cập nhật thành công!", 1.5);
            }
        } catch (error) {
            messageApi.error("❌ Invalid QR Data: Không phải định dạng JSON hợp lệ!", 1.5);
        }

        setTimeout(() => {
            scannedRef.current = false; // Cho phép quét tiếp
        }, 1000);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            {contextHolder}
            <h2>Quét QR Code</h2>
            <Select
                placeholder="Chọn khu vực"
                style={{ width: 200, marginBottom: 10 }}
                onChange={(value) => {
                    setSelectedArea(value);
                    console.log("Khu vực đã chọn:", value);
                }}
                options={[
                    { value: 1, label: "Khu A" },
                    { value: 2, label: "Khu B" },
                    { value: 3, label: "Khu C" },
                    { value: 4, label: "Nhà Thầu" }
                ]}
            />
            <div id="reader" style={{ width: "300px", margin: "auto" }}></div>
            <div style={{ marginTop: 20 }}>
                <Button type="primary" onClick={() => setIsModalVisible(true)}>
                    Xem danh sách Pallet
                </Button>

                <Modal
                    title="Danh sách Pallet"
                    open={isModalVisible}
                    onCancel={() => setIsModalVisible(false)}
                    footer={null}
                    width={window.innerWidth < 768 ? "100%" : "60%"}
                >
                    <Table
                        dataSource={pallets}
                        columns={columns}
                        scroll={{ x: 700, y: 600 }}
                    />
                </Modal>
            </div>
        </div>
    );
}
