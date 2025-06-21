import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { Form, InputNumber, Select, Button, Table, message, Modal, Input } from 'antd';
import axios from 'axios';
import { QRCodeCanvas } from "qrcode.react";
import apiConfig from '../../apiConfig.json';

const { Option } = Select;

export default function TransactionForm() {
    const [zones, setZones] = useState([]);
    const [types, setTypes] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
    const [inventoryData, setInventoryData] = useState([]);
    const [scanningZoneField, setScanningZoneField] = useState(null); // "fromZoneId" | "toZoneId"
    const [qrVisible, setQrVisible] = useState(false);
    const [zoneModalVisible, setZoneModalVisible] = useState(false);

    const html5QrCodeRef = useRef(null);


    const [form] = Form.useForm();

    useEffect(() => {
        fetchInitialData();
        fetchZones();
        fetchTransactions();
    }, []);

    const stopQrScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("QR scanner không chạy hoặc đã dừng:", err.message);
            }
            html5QrCodeRef.current = null;
        }
        setQrVisible(false);
        setScanningZoneField(null);
    };

    useEffect(() => {
        if (qrVisible && scanningZoneField) {
            const qrRegionId = "qr-reader";
            const html5QrCode = new Html5Qrcode(qrRegionId);
            html5QrCodeRef.current = html5QrCode;

            html5QrCode
                .start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    async (decodedText) => {
                        console.log("Scanned:", decodedText);
                        const decodedId = decodedText.replace('ZONE-', '');
                        await form.setFieldValue(scanningZoneField, decodedId);
                        stopQrScanner(); // gọi stop khi quét xong
                    },
                    (err) => {
                        // bạn có thể log hoặc bỏ qua lỗi quét
                    }
                )
                .catch(err => {
                    console.error("Không thể khởi động camera:", err);
                    stopQrScanner();
                    message.error("Không thể khởi động camera");
                });

            // Cleanup khi unmount hoặc qrVisible = false
            return () => {
                stopQrScanner();
            };
        }
    }, [qrVisible, scanningZoneField]);


    const handleDownloadQRCode = (id, value) => {
        const originalCanvas = document.getElementById(`qr-${id}`)?.querySelector("canvas");

        if (originalCanvas) {
            const scale = 2; // phóng to 4 lần
            const width = originalCanvas.width * scale;
            const height = originalCanvas.height * scale;

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;

            const ctx = tempCanvas.getContext("2d");
            if (ctx) {
                ctx.scale(scale, scale);
                ctx.drawImage(originalCanvas, 0, 0);

                const dataURL = tempCanvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = dataURL;
                link.download = `${value}.png`;
                link.click();
            }
        }
    };

    const generateQRCode = (item) => `ZONE-${item.Id}`;
    const fetchInventory = async () => {
        try {
            const res = await axios.get(`${apiConfig.API_BASE_URL}/b2/getpallets`);
            setInventoryData(res.data);
            console.log(res.data)
            setInventoryModalVisible(true);
        } catch (err) {
            console.error('Lỗi khi lấy danh sách pallet:', err);
            message.error('Không thể lấy danh sách pallet');
        }
    };

    const fetchInitialData = async () => {
        const typeRes = await axios.get(`${apiConfig.API_BASE_URL}/b2/getpallettypes`);
        console.log(typeRes.data);
        setTypes(typeRes.data);
    };

    const fetchZones = async () => {
        const typeRes = await axios.get(`${apiConfig.API_BASE_URL}/b2/getzones`);
        console.log(typeRes.data);
        setZones(typeRes.data);
    };

    const fetchTransactions = async () => {
        const res = await axios.get(`${apiConfig.API_BASE_URL}/b2/alltransactions`);
        setTransactions(res.data);
    };

    const handleOpenModal = () => {
        form.resetFields();
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                fromZoneId: values.fromZoneId ?? null,
                toZoneId: values.toZoneId ?? null,
                palletTypeId: values.palletTypeId,
                quantity: values.quantity,
            };

            await axios.post(`${apiConfig.API_BASE_URL}/b2/addtransactions`, payload);
            message.success('Giao dịch được tạo thành công!');
            setModalVisible(false);
            fetchTransactions();
        } catch (err) {
            console.error('Validation or submission error:', err);
            if (err.errorFields) {
                message.error('Vui lòng điền đầy đủ và đúng các trường bắt buộc!');
            } else {
                message.error('Lỗi khi tạo giao dịch');
            }
        }
    };


    return (
        <div style={{ padding: 16 }}>
            <Button type="primary" onClick={handleOpenModal} block>
                Tạo phiếu
            </Button>
            <Button onClick={fetchInventory} style={{ marginBottom: 16 }} block>
                Xem tồn kho theo khu vực
            </Button>
            <Button onClick={() => setZoneModalVisible(true)} block>
                Xem danh sách khu vực
            </Button>

            <Modal
                title="Tạo Giao Dịch Mới"
                open={modalVisible}
                onCancel={handleCancel}
                onOk={handleSubmit}
                okText="Xác nhận"
                cancelText="Hủy"
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item name="fromZoneId" label="Kho xuất">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                disabled
                                value={
                                    zones.find(z => String(z.Id) === String(form.getFieldValue("fromZoneId")))?.ZoneName || ""
                                }
                            // placeholder="Kết quả từ QR"
                            />
                            <Button onClick={() => {
                                setScanningZoneField("fromZoneId");
                                setQrVisible(true);
                            }}>
                                Quét QR
                            </Button>
                        </div>
                    </Form.Item>


                    <Form.Item name="toZoneId" label="Kho nhập" >
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                disabled
                                value={
                                    zones.find(z => String(z.Id) === String(form.getFieldValue("toZoneId")))?.ZoneName || ""
                                }
                            // placeholder="Kết quả từ QR"
                            />
                            <Button onClick={() => {
                                setScanningZoneField("toZoneId");
                                setQrVisible(true);
                            }}>
                                Quét QR
                            </Button>
                        </div>
                    </Form.Item>


                    <Form.Item name="palletTypeId" label="Loại Pallet" rules={[{ required: true }]}>
                        <Select placeholder="Chọn loại pallet">
                            {types.map(t => (
                                <Option key={t.Id} value={t.Id}>
                                    {t.TypeName}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            <Table
                dataSource={transactions}
                rowKey="Id"
                columns={[
                    { title: 'Mã Phiếu', dataIndex: 'TransactionCode' },
                    { title: 'Từ Zone', dataIndex: 'FromZoneName' },
                    { title: 'Đến Zone', dataIndex: 'ToZoneName' },
                    { title: 'Loại Pallet', dataIndex: 'PalletTypeName' },
                    { title: 'Số lượng', dataIndex: 'Quantity' },
                    { title: 'Thời gian', dataIndex: 'Timestamp' },
                ]}
                pagination={{ pageSize: 5 }}
                style={{ marginTop: 32 }}
                scroll={{ x: 1000, y: 500 }}
            />
            <Modal
                title="Danh sách pallet theo khu vực"
                open={inventoryModalVisible}
                onCancel={() => setInventoryModalVisible(false)}
                footer={null}
            >
                <Table
                    dataSource={inventoryData}
                    rowKey={(record, index) => index}
                    columns={[
                        { title: 'Khu vực', dataIndex: 'ZoneName' },
                        { title: 'Loại Pallet', dataIndex: 'PalletType' },
                        { title: 'Số lượng', dataIndex: 'TotalQuantity' },
                        {
                            title: "QR Code",
                            dataIndex: "QRCode",
                            key: "QRCode",
                            align: "center",
                            render: (_, record) => <QRCodeCanvas value={generateQRCode(record)} />,
                        },
                    ]}
                    pagination={false}
                />
            </Modal>
            <Modal
                open={qrVisible}
                title={`Quét mã QR khu vực (${scanningZoneField === "fromZoneId" ? "Từ" : "Đến"})`}
                onCancel={stopQrScanner}
                footer={null}
            >
                <div id="qr-reader" style={{ width: '100%' }}></div>
            </Modal>
            <Modal
                title="Danh sách khu vực"
                open={zoneModalVisible}
                onCancel={() => setZoneModalVisible(false)}
                footer={null}
            >
                <Table
                    dataSource={zones}
                    rowKey="Id"
                    columns={[
                        { title: 'Mã khu vực', dataIndex: 'Id' },
                        { title: 'Tên khu vực', dataIndex: 'ZoneName' },
                        {
                            title: "QR Code",
                            dataIndex: "QRCode",
                            key: "QRCode",
                            align: "center",
                            render: (_, record) => (
                                <div id={`qr-${record.Id}`}>
                                    <QRCodeCanvas value={generateQRCode(record)} size={128} />
                                </div>
                            ),
                        },
                        {
                            title: "Tải về",
                            key: "download",
                            align: "center",
                            render: (_, record) => (
                                <Button
                                    size="small"
                                    onClick={() => handleDownloadQRCode(record.Id, generateQRCode(record))}
                                >
                                    Tải về
                                </Button>
                            ),
                        },
                    ]}
                    pagination={false}
                />
            </Modal>
        </div>
    );
}
