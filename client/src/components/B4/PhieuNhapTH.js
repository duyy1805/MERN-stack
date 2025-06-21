import React, { useState } from 'react';
import { Table, Input, Button, message, DatePicker, Tabs } from 'antd';
import axios from 'axios';
import apiConfig from '../../apiConfig.json';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const PhieuXuat = () => {
    // State chung cho ngày và số phiếu nhập
    const [ngay, setNgay] = useState(dayjs());
    const [soPhieu, setSoPhieu] = useState('');
    const [messageApi, contextHolder] = message.useMessage();

    // State riêng cho phiếu VT
    const [dataPNTH, setDataPNTH] = useState([]);
    const [selectedRowsPNTH, setSelectedRowsPNTH] = useState([]);

    // State riêng cho phiếu BTP
    const [dataPXTH, setDataPXTH] = useState([]);
    const [selectedRowsPXTH, setSelectedRowsPXTH] = useState([]);

    const [dataPXTP, setDataPXTP] = useState([]);
    const [selectedRowsPXTP, setSelectedRowsPXTP] = useState([]);

    const columnsPNTH = [
        {
            title: 'ID Phiếu nhập TH',
            dataIndex: 'ID_PhieuNhapTH',
            key: 'ID_PhieuNhapTH',
            align: 'center'
        },
        {
            title: 'Số phiếu nhập TH',
            dataIndex: 'So_PhieuNhapTH',
            key: 'So_PhieuNhapTH',
            align: 'center'
        },
    ];

    const columnsPXTH = [
        {
            title: 'ID Phiếu Xuất TH',
            dataIndex: 'ID_PhieuXuatTH',
            key: 'ID_PhieuXuatTH',
            align: 'center'
        },
        {
            title: 'Số phiếu xuất TH',
            dataIndex: 'So_PhieuXuatTH',
            key: 'So_PhieuXuatTH',
            align: 'center'
        },
    ];

    const columnsPXTP = [
        {
            title: 'ID Phiếu Xuất TP',
            dataIndex: 'ID_PhieuXuatTP',
            key: 'ID_PhieuXuatTP',
            align: 'center'
        },
        {
            title: 'Số phiếu xuất TP',
            dataIndex: 'So_PhieuXuatTP',
            key: 'So_PhieuXuatTP',
            align: 'center'
        },
    ];
    // Hàm tìm kiếm cho phiếu VT
    const handleSubmitPNTH = async () => {
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
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieunhapth`, {
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
                    self.findIndex((t) => t.ID_PhieuNhapTH === value.ID_PhieuNhapTH) === index
            );
            if (uniqueResults.length > 0) {
                setDataPNTH(uniqueResults);
                messageApi.open({
                    type: 'success',
                    content: `Tìm kiếm phiếu nhập tổng hợp thành công.`,
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: 'Không có dữ liệu nào.',
                });
            }
            setSoPhieu('');
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: 'Lỗi khi gửi request',
            });
        }
    };

    // Hàm ký cho phiếu VT
    const handleKyPNTH = async () => {
        if (selectedRowsPNTH.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu VT để ký.');
            return;
        }
        try {
            const signedRows = [];
            for (let row of selectedRowsPNTH) {
                const { ID_PhieuNhapTH, So_PhieuNhapTH } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieunhapth`, {
                    id_phieu: ID_PhieuNhapTH,
                    ID_Taikhoan: 129,
                });
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuNhapTH} đã ký thành công.`,
                    });
                    signedRows.push(row);
                }
            }
            const newData = dataPNTH.filter(item => !signedRows.some(signed => signed.ID_PhieuNhapTH === item.ID_PhieuNhapTH));
            setDataPNTH(newData);
            setSelectedRowsPNTH([]);
        } catch (error) {
            message.error('Lỗi khi ký phiếu ' + error.message);
        }
    };

    // Hàm tìm kiếm cho phiếu BTP
    const handleSubmitPXTH = async () => {
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
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieuxuatth`, {
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
                    return
                }
            }
            const uniqueResults = allResults.filter(
                (value, index, self) =>
                    self.findIndex((t) => t.ID_PhieuXuatTH === value.ID_PhieuXuatTH) === index
            );
            if (uniqueResults.length > 0) {
                setDataPXTH(uniqueResults);
                messageApi.open({
                    type: 'success',
                    content: `Tìm kiếm phiếu xuất tổng hợp thành công.`,
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: 'Không có dữ liệu nào.',
                });
            }
            setSoPhieu('');
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: 'Lỗi khi gửi request',
            });
        }
    };

    // Hàm ký cho phiếu BTP
    const handleKyPXTH = async () => {
        if (selectedRowsPXTH.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu BTP để ký.');
            return;
        }
        try {
            const signedRows = [];
            for (let row of selectedRowsPXTH) {
                const { ID_PhieuXuatTH, So_PhieuXuatTH } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieuxuatth`, {
                    id_phieu: ID_PhieuXuatTH,
                    ID_Taikhoan: 129,
                });
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuXuatTH} đã ký thành công.`,
                    });
                    signedRows.push(row);
                }
            }
            const newData = dataPXTH.filter(item => !signedRows.some(signed => signed.ID_PhieuXuatTH === item.ID_PhieuXuatTH));
            setDataPXTH(newData);
            setSelectedRowsPXTH([]);
        } catch (error) {
            message.error('Lỗi khi ký phiếu: ' + error.message);
        }
    };
    const handleSubmitPXTP = async () => {
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
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieuxuattp`, {
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
                    self.findIndex((t) => t.ID_PhieuXuatTP === value.ID_PhieuXuatTP) === index
            );
            if (uniqueResults.length > 0) {
                setDataPXTP(uniqueResults);
                messageApi.open({
                    type: 'success',
                    content: `Tìm kiếm phiếu xuất thành phẩm thành công.`,
                });
            } else {
                messageApi.open({
                    type: 'error',
                    content: 'Không có dữ liệu nào.',
                });
            }
            setSoPhieu('');
        } catch (error) {
            messageApi.open({
                type: 'error',
                content: 'Lỗi khi gửi request',
            });
        }
    };

    // Hàm ký cho phiếu BTP
    const handleKyPXTP = async () => {
        if (selectedRowsPXTP.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu xuất TP để ký.');
            return;
        }
        try {
            const signedRows = [];
            for (let row of selectedRowsPXTP) {
                const { ID_PhieuXuatTP, So_PhieuXuatTP } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieuxuattp`, {
                    id_phieu: ID_PhieuXuatTP,
                    ID_Taikhoan: 129,
                });
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuXuatTP} đã ký thành công.`,
                    });
                    signedRows.push(row);
                }
            }
            const newData = dataPXTP.filter(item => !signedRows.some(signed => signed.ID_PhieuXuatTP === item.ID_PhieuXuatTP));
            setDataPXTP(newData);
            setSelectedRowsPXTH([]);
        } catch (error) {
            message.error('Lỗi khi ký phiếu: ' + error.message);
        }
    };
    return (
        <div className="PXVT" style={{ padding: '20px' }}>
            {contextHolder}
            <h2>Phê duyệt phiếu</h2>
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
                <TabPane tab="Phiếu nhập tổng hợp" key="1">
                    <div className="button-group" style={{ marginBottom: '20px' }}>
                        <Button type="primary" onClick={handleSubmitPNTH}>Tìm kiếm</Button>
                        <Button type="primary" onClick={handleKyPNTH} >Ký</Button>
                    </div>
                    <Table
                        dataSource={dataPNTH}
                        columns={columnsPNTH}
                        rowKey="ID_PhieuNhapTH"
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            onChange: (_, rows) => setSelectedRowsPNTH(rows),
                        }}
                    />
                </TabPane>
                <TabPane tab="Phiếu Xuất TH" key="2">
                    <div className="button-group" style={{ marginBottom: '20px' }}>
                        <Button type="primary" onClick={handleSubmitPXTH}>Tìm kiếm</Button>
                        <Button type="primary" onClick={handleKyPXTH} >Ký</Button>
                    </div>
                    <Table
                        dataSource={dataPXTH}
                        columns={columnsPXTH}
                        rowKey="ID_PhieuXuatTH"
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            onChange: (_, rows) => setSelectedRowsPXTH(rows),
                        }}
                    />
                </TabPane>
                <TabPane tab="Phiếu Xuất TP" key="3">
                    <div className="button-group" style={{ marginBottom: '20px' }}>
                        <Button type="primary" onClick={handleSubmitPXTP}>Tìm kiếm</Button>
                        <Button type="primary" onClick={handleKyPXTP} >Ký</Button>
                    </div>
                    <Table
                        dataSource={dataPXTP}
                        columns={columnsPXTP}
                        rowKey="ID_PhieuXuatTP"
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            onChange: (_, rows) => setSelectedRowsPXTP(rows),
                        }}
                    />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default PhieuXuat;
