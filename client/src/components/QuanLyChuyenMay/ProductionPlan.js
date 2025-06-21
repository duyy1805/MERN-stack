import {
    Row, Col, Modal, Card, Radio, Table, message, Button, Tooltip
} from "antd";
import { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import apiConfig from '../../apiConfig.json';
function ProductionPlan() {
    const [data, setData] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedTo, setSelectedTo] = useState('');
    const [assignedToList, setAssignedToList] = useState([]);

    // Lấy danh sách kế hoạch & tổ đã được gán
    const fetchData = async () => {
        try {
            const response = await axios.get(`${apiConfig.API_BASE_URL}/api/TAG_QLSX/getkehoachngay`);
            const list = response.data.sort((a, b) => new Date(a.ngayDongBo) - new Date(b.ngayDongBo));
            setData(list);
        } catch (error) {
            console.error('Lỗi khi gọi API:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    const danhSachToSanXuat = ["Tổ may 1", "Tổ may 2", "Tổ may 3", "Tổ may 4"];
    // Tổ đã được gán
    const usedToSanXuat = data.map(item => item.ToSanXuat).filter(Boolean);
    const availableToSanXuat = danhSachToSanXuat.filter(to => !usedToSanXuat.includes(to));
    // Danh sách tổ sản xuất


    const columns = [
        {
            title: 'STT',
            dataIndex: 'index',
            key: 'index',
            align: 'center',
            width: '5%',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'ID',
            dataIndex: 'ID_KeHoachSanXuat',
            key: 'ID_KeHoachSanXuat',
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'Ngay_BatDauSX',
            key: 'Ngay_BatDauSX',
            align: 'center',
            render: (text) => <Tooltip title={moment(text).format('DD-MM-YYYY')}>{moment(text).format('DD-MM-YYYY')}</Tooltip>,
        },
        {
            title: 'Ngày kết thúc',
            dataIndex: 'Ngay_KetThucSX',
            key: 'Ngay_KetThucSX',
            align: 'center',
            render: (text) => <Tooltip title={moment(text).format('DD-MM-YYYY')}>{moment(text).format('DD-MM-YYYY')}</Tooltip>,
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'Ten_SanPham',
            key: 'Ten_SanPham',
        },
        {
            title: 'Tổ sản xuất',
            dataIndex: 'ToSanXuat',
            key: 'ToSanXuat',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <>
                    <Button
                        style={{ marginRight: 8 }}
                        onClick={() => {
                            setSelectedRow(record);
                            setIsModalVisible(true);
                            setSelectedTo(record.ToSanXuat || '');
                        }}
                    >
                        Gán tổ
                    </Button>

                    {record.ToSanXuat && (
                        <Button danger onClick={() => handleRemoveTo(record)}>
                            Xóa tổ
                        </Button>
                    )}
                </>
            )
        }
    ];
    const handleRemoveTo = async (record) => {
        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QLSX/insert-or-update-kehoach-cnpn`, {
                ID_KeHoachSanXuat: record.ID_KeHoachSanXuat,
                ToSanXuat: ''  // hoặc null, tuỳ cách backend xử lý
            });

            if (response.data.success) {
                message.success('Đã xóa tổ sản xuất khỏi kế hoạch.');
                fetchData(); // Cập nhật lại bảng
            } else {
                message.error('Xóa tổ thất bại.');
            }
        } catch (error) {
            console.error('Lỗi khi gọi API:', error);
            message.error('Lỗi máy chủ.');
        }
    };

    const handleOk = async () => {
        // if (!selectedTo) {
        //     message.warning('Vui lòng chọn tổ sản xuất!');
        //     return;
        // }

        try {
            const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QLSX/insert-or-update-kehoach-cnpn`, {
                ID_KeHoachSanXuat: selectedRow.ID_KeHoachSanXuat,
                ToSanXuat: selectedTo
            });

            if (response.data.success) {
                message.success(response.data.message);
                setIsModalVisible(false);
                fetchData(); // cập nhật lại danh sách tổ
            } else {
                message.error("Thao tác thất bại.");
            }
        } catch (error) {
            console.error("Lỗi khi gọi API:", error);
            message.error("Lỗi máy chủ.");
        }
    };

    return (
        <div style={{ backgroundColor: '#f0f2f5', height: '100vh', padding: 0 }}>
            <div style={{ padding: 10 }}>
                <Row gutter={[24, 0]}>
                    <Col span={24}>
                        <Card title="Danh sách kế hoạch ngày">
                            <Table
                                rowKey="ID_KeHoachSanXuat"
                                columns={columns}
                                dataSource={data}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            <Modal
                title="Gán tổ sản xuất"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => {
                    if (selectedTo && selectedRow) {
                        const updatedData = data.map((item) =>
                            item.ID_KeHoachSanXuat === selectedRow.ID_KeHoachSanXuat
                                ? { ...item, ToSanXuat: selectedTo }
                                : item
                        );
                        setData(updatedData);
                        handleOk();
                        setIsModalVisible(false);
                        setSelectedTo(null);
                    }
                }}
                okButtonProps={{ disabled: !selectedTo }}
            >
                {availableToSanXuat.length === 0 ? (
                    <p style={{ color: 'red' }}>Tất cả các tổ đã được gán.</p>
                ) : (
                    <Radio.Group
                        onChange={(e) => setSelectedTo(e.target.value)}
                        value={selectedTo}
                    >
                        {availableToSanXuat.map((to) => (
                            <Radio key={to} value={to}>
                                {to}
                            </Radio>
                        ))}
                    </Radio.Group>
                )}
            </Modal>
        </div>
    );
}

export default ProductionPlan;
