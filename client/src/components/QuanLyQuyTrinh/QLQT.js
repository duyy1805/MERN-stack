import React, { useEffect, useState } from 'react';
import { Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';

const { Search } = Input;

const QLQT = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);         // phiên bản mới nhất của mỗi quy trình
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu phiên bản của quy trình được chọn
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn

    // Định nghĩa các cột của Table chính
    const columns = [
        {
            title: 'Mã Quy Trình',
            dataIndex: 'MaSo',
            key: 'MaSo',
        },
        {
            title: 'Tên Quy Trình',
            dataIndex: 'TenQuyTrinh',
            key: 'TenQuyTrinh',
            render: (text) =>
                text && text.length > 20 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 20)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Người Lập',
            dataIndex: 'NguoiLap',
            key: 'NguoiLap',
        },
        {
            title: 'Người Kiểm Tra',
            dataIndex: 'NguoiKiemTra',
            key: 'NguoiKiemTra',
        },
        {
            title: 'Người Phê Duyệt',
            dataIndex: 'NguoiPheDuyet',
            key: 'NguoiPheDuyet',
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={() => handleViewDetails(record.QuyTrinhId, record.TenQuyTrinh)}
                >
                    Xem tất cả
                </Button>
            ),
        },
    ];

    // Hàm lấy dữ liệu từ API
    useEffect(() => {
        setLoading(true);
        axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinh`)
            .then(res => {
                const list = res.data; // giả sử API trả về mảng các bản ghi phiên bản của quy trình
                console.log(list);
                setAllData(list);
                const latestVersions = getLatestVersions(list);
                setData(latestVersions);
                setLoading(false);
            })
            .catch(error => {
                message.error('Lỗi khi lấy dữ liệu: ' + error.message);
                setLoading(false);
            });
    }, []);

    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo QuyTrinhId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            // So sánh phiên bản (giả sử PhienBan là kiểu int)
            if (!grouped[key] || item.PhienBan > grouped[key].PhienBan) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => b.PhienBan - a.PhienBan);
    };

    // Hàm tìm kiếm theo tên quy trình (lọc trên dữ liệu phiên bản mới nhất)
    const onSearch = (value) => {
        const filtered = getLatestVersions(allData).filter(item =>
            item.TenQuyTrinh && item.TenQuyTrinh.toLowerCase().includes(value.toLowerCase())
        );
        setData(filtered);
    };

    // Khi nhấn nút "Xem tất cả", hiển thị modal với tất cả các phiên bản của quy trình được chọn
    const handleViewDetails = (quyTrinhId, tenQuyTrinh) => {
        const details = allData
            .filter(item => item.QuyTrinhId === quyTrinhId)
            .sort((a, b) => b.PhienBan - a.PhienBan);
        setModalData(details);
        setModalTitle(tenQuyTrinh); // sử dụng tên quy trình làm tiêu đề cho modal
        setModalVisible(true);
    };

    // Định nghĩa cột cho bảng trong modal hiển thị danh sách phiên bản
    const modalColumns = [
        {
            title: 'Phiên Bản',
            dataIndex: 'PhienBan',
            key: 'PhienBan',
        },
        {
            title: 'Ngày Hiệu Lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Người Lập',
            dataIndex: 'NguoiLap',
            key: 'NguoiLap',
        },
        {
            title: 'Người Kiểm Tra',
            dataIndex: 'NguoiKiemTra',
            key: 'NguoiKiemTra',
        },
        {
            title: 'Người Phê Duyệt',
            dataIndex: 'NguoiPheDuyet',
            key: 'NguoiPheDuyet',
        },
        {
            title: 'Ngày Tạo',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Row gutter={[16, 16]}>
                {/* Cột bên trái: ô tìm kiếm */}
                <Col xs={24} sm={4}>
                    <Search
                        placeholder="Nhập tên quy trình cần tìm"
                        enterButton="Tìm"
                        allowClear
                        onSearch={onSearch}
                    />
                </Col>
                {/* Cột bên phải: bảng danh sách phiên bản mới nhất */}
                <Col xs={24} sm={20}>
                    {loading ? <Spin /> : <Table dataSource={data} columns={columns} rowKey="VersionID" />}
                </Col>
            </Row>

            {/* Modal hiển thị tất cả các phiên bản của quy trình được chọn */}
            <Modal
                title={modalTitle}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={1000}
            >
                <Table dataSource={modalData} columns={modalColumns} rowKey="VersionID" pagination={false} />
            </Modal>
        </div>
    );
};

export default QLQT;
