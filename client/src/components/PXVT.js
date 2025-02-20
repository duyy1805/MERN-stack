import React, { useState } from 'react';
import { Table, Input, Button, message, Checkbox, DatePicker } from 'antd';
import axios from 'axios';
import apiConfig from '../apiConfig.json'
import dayjs from 'dayjs';
import "./PXVT.css";
const PhieuXuat = () => {
    // State để lưu dữ liệu nhập vào và dữ liệu trả về
    const [ngay, setNgay] = useState(dayjs());
    const [soPhieu, setSoPhieu] = useState('');
    const [data, setData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);

    const [messageApi, contextHolder] = message.useMessage();
    // Cấu hình các cột trong bảng (bao gồm các trường mới)
    const columns = [
        { title: 'ID Phiếu Xuất', dataIndex: 'ID_PhieuXuatVT', key: 'ID_PhieuXuatVT' },
        { title: 'Số phiếu xuất', dataIndex: 'Số phiếu xuất', key: 'So_PhieuXuatVT' },
        { title: 'Ngày xuất', dataIndex: 'Ngày xuất vt', key: 'Ngay_XuatVT' },
        // Bạn có thể thêm các cột khác tùy vào dữ liệu trả về từ API
    ];

    const handleSubmit = async () => {
        if (!ngay || !soPhieu) {
            messageApi.open({
                type: 'error',
                content: `Vui lòng nhập đầy đủ ngày và số phiếu`,
            });
            return;
        }

        // Chuyển chuỗi số phiếu thành mảng, tách bằng các ký tự phân cách như dấu cách, dấu phẩy hoặc dấu xuống dòng
        const soPhieuArray = soPhieu
            .split(/\s+|\n+|,/) // Tách chuỗi dựa trên dấu cách, dấu xuống dòng hoặc dấu phẩy
            .map(item => item.trim())
            .filter(item => item.length > 0); // Lọc bỏ các mục rỗng
        console.log(soPhieuArray);

        try {
            // Lưu kết quả vào biến hoặc state
            let allResults = [];

            // Gọi API cho từng số phiếu trong mảng
            for (const phieu of soPhieuArray) {
                console.log('Gửi yêu cầu cho phiếu:', phieu);
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/getphieuxuat`, {
                    Ngay: ngay,
                    sophieu: phieu // Chỉ gửi một số phiếu mỗi lần
                });
                console.log('Kết quả trả về:', response);
                if (response.data && response.data.length > 0) {
                    allResults = [...allResults, ...response.data]; // Kết hợp kết quả trả về vào mảng allResults
                } else {
                    messageApi.open({
                        type: 'error',
                        content: `Không có dữ liệu cho phiếu ${phieu}.`,
                    });
                }
            }
            // Lọc bỏ các kết quả trùng lặp theo số phiếu
            const uniqueResults = allResults.filter((value, index, self) =>
                self.findIndex((t) => t.ID_PhieuXuatVT === value.ID_PhieuXuatVT) === index
            );
            console.log('Kết quả cuối cùng:', uniqueResults);
            // Cập nhật state với các kết quả đã lọc
            if (uniqueResults.length > 0) {
                setData(uniqueResults); // Lưu kết quả vào state
                messageApi.open({
                    type: 'success',
                    content: `Done`,
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

    // Hàm xử lý khi nhấn nút "Ký"
    const handleKy = async () => {
        if (selectedRows.length === 0) {
            message.error('Vui lòng chọn ít nhất một phiếu để ký.');
            return;
        }

        try {
            // Gửi yêu cầu API cho từng phiếu đã chọn
            const signedRows = []; // Mảng lưu các phiếu đã ký
            for (let row of selectedRows) {
                const { ID_PhieuXuatVT, ["Số phiếu xuất"]: So_PhieuXuatVT } = row;
                const response = await axios.post(`${apiConfig.API_BASE_URL}/api/TAG_QTKD/kyphieuxuat`, {
                    id_phieu: ID_PhieuXuatVT,
                    ID_Taikhoan: 444,
                });
                console.log('Kết quả ký phiếu:', response);
                if (response.status === 200) {
                    messageApi.open({
                        type: 'success',
                        content: `Phiếu ${So_PhieuXuatVT} đã ký thành công.`,
                    });
                    signedRows.push(row); // Lưu phiếu đã ký
                } else {
                    message.error(`Lỗi khi ký phiếu ${So_PhieuXuatVT}`);
                }
            }

            // Lọc bỏ các phiếu đã ký khỏi danh sách
            const newData = data.filter(item => !signedRows.some(signed => signed.ID_PhieuXuatVT === item.ID_PhieuXuatVT));

            // Cập nhật lại danh sách phiếu chưa ký
            setData(newData);
            setSelectedRows([]); // Reset lại các dòng đã chọn
        } catch (error) {
            message.error('Lỗi khi ký phiếu: ' + error.message);
        }
    };

    return (
        <div className="PXVT" style={{ padding: '20px' }}>
            {contextHolder}
            <h2>Phiếu Xuất Vật Tư</h2>
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
                <Button type="primary" onClick={handleSubmit}>Tìm kiếm</Button>
            </div>

            <Table
                dataSource={data}
                columns={columns}
                rowKey="ID_PhieuXuatVT" // Chọn một trường làm key cho từng dòng dữ liệu
                pagination={false}
                scroll={{
                    y: 100 * 5,
                }}
                rowSelection={{
                    type: 'checkbox',
                    onChange: (selectedRowKeys, selectedRows) => {
                        setSelectedRows(selectedRows); // Lưu các dòng được chọn
                        console.log('Hàng đã chọn:', selectedRows); // Log ra các hàng đã chọn
                    },

                }}
            />
            <div>
                <Button type="primary" onClick={handleKy} style={{ marginTop: '20px' }}>
                    Ký
                </Button>
            </div>
        </div>
    );
};

export default PhieuXuat;
