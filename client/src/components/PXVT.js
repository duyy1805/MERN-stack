import React, { useState } from 'react';
import { Table, Input, Button, message, DatePicker, Tabs } from 'antd';
import axios from 'axios';
import apiConfig from '../apiConfig.json';
import dayjs from 'dayjs';
import './PXVT.css';

const { TabPane } = Tabs;

const PhieuXuat = () => {
    // State chung cho ngày và số phiếu nhập
    const [ngay, setNgay] = useState(dayjs());
    const [soPhieu, setSoPhieu] = useState('');
    const [messageApi, contextHolder] = message.useMessage();

    // State riêng cho phiếu VT
    const [dataVT, setDataVT] = useState([]);
    const [selectedRowsVT, setSelectedRowsVT] = useState([]);

    // State riêng cho phiếu BTP
    const [dataBTP, setDataBTP] = useState([]);
    const [selectedRowsBTP, setSelectedRowsBTP] = useState([]);

    const columnsVT = [
        {
            title: 'ID Phiếu Xuất VT',
            dataIndex: 'ID_PhieuXuatVT',
            key: 'ID_PhieuXuatVT',
            align: 'center'
        },
        {
            title:
                'Số phiếu xuất VT',
            dataIndex: 'Số phiếu xuất',
            key: 'So_PhieuXuatVT',
            align: 'center'
        },
    ];

    const columnsBTP = [
        {
            title: 'ID Phiếu Xuất BTP',
            dataIndex: 'ID_PhieuXuatBTP',
            key: 'ID_PhieuXuatBTP',
            align: 'center'
        },
        {
            title: 'Số phiếu xuất BTP',
            dataIndex: 'So_PhieuXuatBTP',
            key: 'So_PhieuXuatBTP',
            align: 'center'
        },
    ];

    // Hàm tìm kiếm cho phiếu VT
    const handleSubmitVT = async () => {
        if (!ngay || !soPhieu) {
            messageApi.open({
                type: 'error',
                content: `Vui lòng nhập đầy đủ ngày và số phiếu`,
            });
            return;
        }

        const soPhieuArray = soPhieu
            .split(/\s+|\n+|,/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

        try {
            let allResults = [];
            for (const phieu of soPhieuArray) {
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieuxuat`, {
                    Ngay: ngay,
                    sophieu: phieu,
                });
                if (response.data && response.data.length > 0) {
                    allResults = [...allResults, ...response.data];
                } else {
                    messageApi.open({
                        type: 'error',
                        content: `Không có dữ liệu cho phiếu ${phieu}.`,
                    });
                }
            }
            // Loại bỏ các kết quả trùng lặp theo ID
            const uniqueResults = allResults.filter(
                (value, index, self) =>
                    self.findIndex((t) => t.ID_PhieuXuatVT === value.ID_PhieuXuatVT) === index
            );
            if (uniqueResults.length > 0) {
                setDataVT(uniqueResults);
                messageApi.open({
                    type: 'success',
                    content: `Tìm kiếm phiếu VT thành công.`,
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: 'Không có dữ liệu nào.',
                });
            }
            setSoPhieu('');
        } catch (error) {
            message.error('Lỗi khi gửi yêu cầu: ' + error.message);
        }
    };

    // Hàm ký cho phiếu VT
    const handleKyVT = async () => {
        if (selectedRowsVT.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu VT để ký.');
            return;
        }
        try {
            const signedRows = [];
            for (let row of selectedRowsVT) {
                const { ID_PhieuXuatVT, ['Số phiếu xuất']: So_PhieuXuatVT } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieuxuat`, {
                    id_phieu: ID_PhieuXuatVT,
                    ID_Taikhoan: 444,
                });
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuXuatVT} đã ký thành công.`,
                    });
                    signedRows.push(row);
                }
            }
            const newData = dataVT.filter(item => !signedRows.some(signed => signed.ID_PhieuXuatVT === item.ID_PhieuXuatVT));
            setDataVT(newData);
            setSelectedRowsVT([]);
        } catch (error) {
            message.error('Lỗi khi ký phiếu VT: ' + error.message);
        }
    };

    // Hàm tìm kiếm cho phiếu BTP
    const handleSubmitBTP = async () => {
        if (!ngay || !soPhieu) {
            messageApi.open({
                type: 'error',
                content: `Vui lòng nhập đầy đủ ngày và số phiếu`,
            });
            return;
        }

        const soPhieuArray = soPhieu
            .split(/\s+|\n+|,/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

        try {
            let allResults = [];
            for (const phieu of soPhieuArray) {
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieuxuatBTP`, {
                    Ngay: ngay,
                    sophieu: phieu,
                });
                if (response.data && response.data.length > 0) {
                    allResults = [...allResults, ...response.data];
                } else {
                    messageApi.open({
                        type: 'error',
                        content: `Không có dữ liệu cho phiếu ${phieu}.`,
                    });
                }
            }
            const uniqueResults = allResults.filter(
                (value, index, self) =>
                    self.findIndex((t) => t.ID_PhieuXuatBTP === value.ID_PhieuXuatBTP) === index
            );
            if (uniqueResults.length > 0) {
                setDataBTP(uniqueResults);
                messageApi.open({
                    type: 'success',
                    content: `Tìm kiếm phiếu BTP thành công.`,
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: 'Không có dữ liệu nào.',
                });
            }
            setSoPhieu('');
        } catch (error) {
            message.error('Lỗi khi gửi yêu cầu: ' + error.message);
        }
    };

    // Hàm ký cho phiếu BTP
    const handleKyBTP = async () => {
        if (selectedRowsBTP.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu BTP để ký.');
            return;
        }
        try {
            const signedRows = [];
            for (let row of selectedRowsBTP) {
                const { ID_PhieuXuatBTP, So_PhieuXuatBTP } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieuxuatbtp`, {
                    id_phieu: ID_PhieuXuatBTP,
                    ID_Taikhoan: 444,
                });
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuXuatBTP} đã ký thành công.`,
                    });
                    signedRows.push(row);
                }
            }
            const newData = dataBTP.filter(item => !signedRows.some(signed => signed.ID_PhieuXuatBTP === item.ID_PhieuXuatBTP));
            setDataBTP(newData);
            setSelectedRowsBTP([]);
        } catch (error) {
            message.error('Lỗi khi ký phiếu BTP: ' + error.message);
        }
    };

    return (
        <div className="PXVT" style={{ padding: '20px' }}>
            {contextHolder}
            <h2>Phiếu Xuất</h2>
            <div style={{ marginBottom: '20px' }}>
                <DatePicker
                    value={ngay ? dayjs(ngay) : null}
                    onChange={(date, dateString) => setNgay(dateString)}
                    placeholder="Chọn ngày"
                    style={{ minWidth: '200px', marginRight: '10px' }}
                />
                <Input
                    value={soPhieu}
                    onChange={(e) => setSoPhieu(e.target.value)}
                    placeholder="Nhập số phiếu"
                    style={{ minWidth: '200px', marginRight: '10px' }}
                />
            </div>

            <Tabs defaultActiveKey="1">
                <TabPane tab="Phiếu Xuất VT" key="1">
                    <div className="button-group" style={{ marginBottom: '20px' }}>
                        <Button type="primary" onClick={handleSubmitVT}>Tìm kiếm</Button>
                        <Button type="primary" onClick={handleKyVT} >Ký</Button>
                    </div>
                    <Table
                        dataSource={dataVT}
                        columns={columnsVT}
                        rowKey="ID_PhieuXuatVT"
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            onChange: (_, rows) => setSelectedRowsVT(rows),
                        }}
                    />
                </TabPane>
                <TabPane tab="Phiếu Xuất BTP" key="2">
                    <div className="button-group" style={{ marginBottom: '20px' }}>
                        <Button type="primary" onClick={handleSubmitBTP}>Tìm kiếm</Button>
                        <Button type="primary" onClick={handleKyBTP} >Ký</Button>
                    </div>
                    <Table
                        dataSource={dataBTP}
                        columns={columnsBTP}
                        rowKey="ID_PhieuXuatBTP"
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            onChange: (_, rows) => setSelectedRowsBTP(rows),
                        }}
                    />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default PhieuXuat;
