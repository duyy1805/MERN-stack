import React, { useEffect, useState } from 'react';
import {
    Row, Col, Input, Table, Spin, message, Button, Modal, Tooltip,
    Upload, Form, DatePicker, Select, Layout, Menu, Dropdown, Avatar,
    Card, Typography
} from 'antd';
import { PieChart, Pie, Cell, Tooltip as TooltipRechart, Legend, ResponsiveContainer } from "recharts";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import axios from 'axios';
import dayjs from 'dayjs';
import apiConfig from '../../apiConfig.json';
import ViewerPDF from './ViewerPDF';
import style from './QLQT.module.css';

const loadFile = async (url) => {
    const response = await fetch(url);
    return response.arrayBuffer();
};
const { Header, Content } = Layout;

const QLQT = () => {
    const [allData, setAllData] = useState([]); // tất cả phiên bản của các quy trình
    const [data, setData] = useState([]);
    const [allProcessNames, setAllProcessNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [prevModalVisible, setPrevModalVisible] = useState(false);
    const [modalData, setModalData] = useState([]); // dữ liệu phiên bản của quy trình được chọn
    const [modalTitle, setModalTitle] = useState(''); // tên quy trình được chọn
    const [modalTitleId, setModalTitleId] = useState(''); // id quy trình được chọn

    const [isModalSuaDoiOpen, setIsModalSuaDoiOpen] = useState(false);
    const [formSuaDoi] = Form.useForm();
    const [taiLieuList, setTaiLieuList] = useState([]);


    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    // --- Modal nhận xét khi xem tài liệu ---
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [comment, setComment] = useState('');

    const [messageApi, contextHolder] = message.useMessage();
    // Hàm xử lý khi người dùng xác nhận nhận xét

    const handleOpenSuaDoiModal = () => {
        formSuaDoi.resetFields();
        setTaiLieuList([]); // Reset danh sách tài liệu khi mở modal
        setIsModalSuaDoiOpen(true);
    };
    const addTaiLieu = () => {
        setTaiLieuList([...taiLieuList, { key: Date.now(), TenTaiLieu: "", MaTaiLieu: "", NoiDungYeuCau: "", LyDo: "" }]);
    };

    const updateTaiLieu = (key, field, value) => {
        setTaiLieuList(taiLieuList.map(item => (item.key === key ? { ...item, [field]: value } : item)));
    };

    const handleGenerate = async (values) => {
        try {
            message.loading({ content: "Đang tạo file...", key: "docx" });

            // Chuẩn bị dữ liệu với ngày tháng tự động
            const finalData = {
                ...values,
                NgayYeuCau: dayjs().format("DD/MM/YYYY"),
                SoanThaoMoi: 1,
                ChinhSua: 0,
                BanHanh: 0,
                TaiLieu: taiLieuList.map((item, index) => ({
                    Stt: index + 1,
                    ...item
                })),
                NgayYKienTruongBoPhan: dayjs().format("DD/MM/YYYY"),
                // NgayYKienBoPhanQuanLy: dayjs().format("DD/MM/YYYY"),
            };

            // Load template DOCX
            const content = await loadFile("/temp.docx");
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

            doc.setData(finalData);
            doc.render();

            const output = doc.getZip().generate({ type: "blob" });
            saveAs(output, "output.docx");

            message.success({ content: "Xuất file DOCX thành công!", key: "docx" });
            setIsModalSuaDoiOpen(false);
        } catch (error) {
            console.error("Lỗi khi tạo file DOCX:", error);
            message.error("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };
    const handleConfirmComment = async () => {
        try {
            const userId = localStorage.getItem('userId');
            await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                NguoiDungId: parseInt(userId),
                QuyTrinhVersionId: currentRecord.VersionId,
                NhanXet: comment
            });
            setModalData((prevData) =>
                prevData.map((item) =>
                    item.VersionId === currentRecord.VersionId
                        ? { ...item, NhanXet: comment } // Cập nhật nhận xét
                        : item
                )
            );
            setData((prevData) =>
                prevData.map((item) =>
                    item.VersionId === currentRecord.VersionId
                        ? { ...item, NhanXet: comment } // Cập nhật nhận xét
                        : item
                )
            );
            messageApi.open({ type: 'success', content: `Đã đánh dấu tài liệu là đã xem !` });
        } catch (error) {
            messageApi.open({ type: 'error', content: "Có lỗi xảy ra khi đánh dấu đã xem" });
        } finally {
            setIsCommentModalVisible(false);
            setComment('');
        }
    };
    const handleOpenCommentModal = () => {
        setIsCommentModalVisible(true);
    };
    // Xử lý khi chọn file

    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get(`${apiConfig.API_BASE_URL}/B8/quytrinh`, {
                params: { userId } // truyền userId vào query string
            });
            const list = res.data;
            setAllData(list);
            setData(getLatestVersions(list));

            const names = Array.from(
                new Set(list.map((item) => item.TenQuyTrinh).filter(Boolean))
            );
            setAllProcessNames(names);
        } catch (error) {
            message.error('Lỗi khi lấy dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Khi người dùng click vào 1 hàng, mở PDF ngay lập tức
    const handleViewPdf = async (record) => {
        setPrevModalVisible(modalVisible); // Lưu trạng thái trước khi đóng
        setModalVisible(false);
        setCurrentRecord(record);
        console.log(record)
        if (record.VersionId === null) {
            messageApi.open({
                type: 'error',
                content: `Phiên bản không tồn tại!`,
            });
        }
        else {
            const url = `${apiConfig.API_BASE_URL}/B8/viewPDF?QuyTrinhVersionId=${record.VersionId}`;
            setPdfUrl(url);
            setPdfVisible(true);
            if (record.NgayXem === null) {
                try {
                    const userId = localStorage.getItem('userId');
                    await axios.post(`${apiConfig.API_BASE_URL}/B8/markAsViewed`, {
                        NguoiDungId: parseInt(userId),
                        QuyTrinhVersionId: record.VersionId,
                        NhanXet: 'NULL',
                    });

                    // ✅ Cập nhật trực tiếp dữ liệu
                    setData((prevData) =>
                        prevData.map((item) =>
                            item.VersionId === record.VersionId
                                ? {
                                    ...item,
                                    TrangThai: "Đã xem",
                                    NgayXem: dayjs().format("YYYY-MM-DD HH:mm:ss") // Định dạng ngày giờ
                                }
                                : item
                        )
                    );
                    setAllData((prevData) =>
                        prevData.map((item) =>
                            item.VersionId === record.VersionId
                                ? {
                                    ...item,
                                    TrangThai: "Đã xem",
                                    NgayXem: dayjs().format("YYYY-MM-DD HH:mm:ss") // Định dạng ngày giờ
                                }
                                : item
                        )
                    );
                    message.success("Đã xem");
                } catch (error) {
                    console.log(error);
                    message.error("Có lỗi xảy ra khi đánh dấu đã xem: " + error.message);
                }
            }
        }
    };
    // Xử lý submit form thêm phiên bản mới

    const optionsSelect = Array.from(
        new Set(data.map((item) => item.TenQuyTrinh).filter(Boolean))
    ).map((uniqueName) => ({
        label: uniqueName,
        value: uniqueName,
    }));
    const createFilters = (key) => {
        const uniqueValues = [...new Set(data.map((item) => item[key]))];
        return uniqueValues.map((value) => ({
            text: value,
            value,
        }));
    };

    const uniqueBoPhan = [...new Set(allData
        .map(item => item.BoPhan)
        .filter(bp => bp))] // Loại bỏ giá trị NULL hoặc rỗng

    const boPhanOptions = uniqueBoPhan.map(bp => ({
        value: bp,
        label: bp
    }));
    const LPTFilters = createFilters('BoPhanBanHanh');
    const LPTFilters_TenQuyTrinh = createFilters('TenQuyTrinh');
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
            width: '30%',
            filters: LPTFilters_TenQuyTrinh,
            filterSearch: true,
            onFilter: (value, record) => record.TenQuyTrinh.includes(value),
            render: (text) =>
                text && text.length > 50 ? (
                    <Tooltip title={text}>
                        <span>{text.slice(0, 50)}...</span>
                    </Tooltip>
                ) : (
                    text
                ),
        },
        {
            title: 'Bộ phận ban hành',
            dataIndex: 'BoPhanBanHanh',
            key: 'BoPhanBanHanh',
            width: '15%',
            align: 'center',
            filters: LPTFilters,
            filterSearch: true,
            onFilter: (value, record) => record.BoPhanBanHanh.includes(value),
        },
        {
            title: 'File PDF',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: 'center',
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.VersionId}`;
                return <div><a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a></div>;
            },
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: 'center',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: 'center',
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ghi chú',
            key: 'GhiChu',
            render: (_, record) => {
                // Kiểm tra BoPhanGui có null không
                const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
                return boPhanGuiArray.includes(record.BoPhan) ? 'Được gửi mail' : '';
            }
        },
        {
            title: 'Chi Tiết',
            key: 'action',
            render: (text, record) => (
                <Button
                    type="primary"
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(record.QuyTrinhId, record.TenQuyTrinh); }}
                >
                    Xem tất cả
                </Button>
            ),
        },
    ];

    // Hàm lấy dữ liệu từ API
    useEffect(() => {
        fetchData();
    }, []);
    console.log(allData)
    // Hàm lọc để lấy phiên bản mới nhất cho mỗi QuyTrinh (theo QuyTrinhId)
    const getLatestVersions = (list) => {
        const grouped = {};
        list.forEach(item => {
            const key = item.QuyTrinhId;
            const version = parseFloat(item.PhienBan); // Chuyển đổi thành số

            if (!grouped[key] || version > parseFloat(grouped[key].PhienBan)) {
                grouped[key] = item;
            }
        });
        // Sắp xếp theo thứ tự giảm dần của PhienBan
        return Object.values(grouped).sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao))
    };
    // Hàm tìm kiếm theo tên quy trình (lọc trên dữ liệu phiên bản mới nhất)
    const onSearch = (value) => {
        const filtered = getLatestVersions(allData).filter(item =>
            item.TenQuyTrinh && item.TenQuyTrinh.toLowerCase().includes(value.toLowerCase())
        );
        setData(filtered);
    };
    // Khi nhấn nút "Xem tất cả", hiển thị modal với tất cả các phiên bản của quy trình được chọn
    const handleViewDetails = (QuyTrinhId, TenQuyTrinh) => {
        const details = allData
            .filter(item => item.QuyTrinhId === QuyTrinhId)
            .sort((a, b) => b.PhienBan - a.PhienBan);
        setModalData(details);
        setModalTitle(TenQuyTrinh);
        setModalTitleId(QuyTrinhId);
        setModalVisible(true);
    };
    const handleSelectProcess = (value) => {
        if (value) {
            const filteredData = getLatestVersions(
                allData.filter((item) => item.TenQuyTrinh === value)
            );
            setData(filteredData);
        } else {
            setData(getLatestVersions(allData)); // Nếu không chọn gì, hiển thị toàn bộ
        }
    };
    const handleConfirm = async (record, field) => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.post(`${apiConfig.API_BASE_URL}/B8/confirmAction`, {
                NguoiDungId: parseInt(userId),
                QuyTrinhVersionId: record.VersionId,
                Field: field,
            });

            if (response.data.success) {
                messageApi.open({ type: 'success', content: `Đã xác nhận ${field} thành công!` });
                // Cập nhật trạng thái modalData
                setModalData((prevData) =>
                    prevData.map((item) =>
                        item.QuyTrinhVersionId === record.QuyTrinhVersionId
                            ? { ...item, [field]: dayjs().format('YYYY-MM-DD') }
                            : item
                    )
                );
            } else {
                messageApi.open({ type: 'error', content: "Có lỗi xảy ra khi xác nhận" });
            }
        } catch (error) {
            messageApi.open({ type: 'error', content: "Có lỗi xảy ra" });
        }
    };

    const renderDateOrButton = (date, record, field) => {
        return date ? dayjs(date).format('YYYY-MM-DD') : (
            <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); handleConfirm(record, field) }}>
                Xác nhận
            </Button>
        );
    };
    // Định nghĩa cột cho bảng trong modal hiển thị danh sách phiên bản
    const modalColumns = [
        {
            title: 'Phiên bản',
            dataIndex: 'FilePDF',
            key: 'FilePDF',
            align: "center",
            render: (text, record) => {
                if (record.PhienBan === null) {
                    return <span>Chưa có phiên bản</span>;
                }
                const downloadUrl = `${apiConfig.API_BASE_URL}/B8/downloadPDF?QuyTrinhVersionId=${record.QuyTrinhVersionId}`;
                return <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{record.PhienBan}</a>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'NhanXet',
            key: 'NhanXet',
        },
        {
            title: 'Ngày xem',
            dataIndex: 'NgayXem',
            key: 'NgayXem',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Comment',
            dataIndex: 'Comment',
            key: 'Comment',
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'NgayHieuLuc',
            key: 'NgayHieuLuc',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        {
            title: 'Ngày cập nhật',
            dataIndex: 'NgayTao',
            key: 'NgayTao',
            align: "center",
            render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '',
        },
        // {
        //     title: 'Đồng ý',
        //     dataIndex: 'NgayDongY',
        //     key: 'NgayDongY',
        //     align: "center",
        //     render: (date, record) => renderDateOrButton(date, record, 'NgayDongY'),
        // },
        // {
        //     title: 'Tuân thủ',
        //     dataIndex: 'NgayTuanThu',
        //     key: 'NgayTuanThu',
        //     align: "center",
        //     render: (date, record) => renderDateOrButton(date, record, 'NgayTuanThu'),
        // },
        // {
        //     title: 'Đào tạo',
        //     dataIndex: 'NgayDaoTao',
        //     key: 'NgayDaoTao',
        //     align: "center",
        //     render: (date, record) => renderDateOrButton(date, record, 'NgayDaoTao'),
        // },
        {
            title: 'Ghi chú',
            key: 'GhiChu',
            render: (_, record) => {
                // Kiểm tra BoPhanGui có null không
                const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
                return boPhanGuiArray.includes(record.BoPhan) ? 'Được gửi mail' : '';
            }
        }
    ];
    const taiLieuMoi = allData.filter(record => {
        if (!record.NgayTao) return false;
        const ngayTao = dayjs(record.NgayTao);
        return dayjs().diff(ngayTao, "day") < 30;
    });
    const taiLieuGuiMail = allData.filter(record => {
        const boPhanGuiArray = record.BoPhanGui ? record.BoPhanGui.split(',') : [];
        return boPhanGuiArray.includes(record.BoPhan);
    });

    const soTaiLieuDaXem = taiLieuGuiMail.filter(record => record.TrangThai !== 'Chưa xem').length;
    const soTaiLieuChuaXem = taiLieuGuiMail.filter(record => record.TrangThai === 'Chưa xem').length;
    console.log(soTaiLieuChuaXem)
    const piedata = [
        { name: "Đã xem", value: soTaiLieuDaXem },
        { name: "Chưa xem", value: soTaiLieuChuaXem },
    ];
    const COLORS = ["#0088FE", "#f63d3de0"];
    return (
        <Layout className={style.admin}>
            <Content style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
                {contextHolder}
                <Row gutter={[16, 16]}>
                    {/* Cột bên trái: ô tìm kiếm */}
                    <Col xs={24} sm={8}>
                        <Card title="Tài liệu được nhận" style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height={100}>
                                <PieChart >
                                    <Pie
                                        data={piedata}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={40}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label
                                    >
                                        {piedata.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <TooltipRechart />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    {/* <Col xs={24} sm={8}>
                        <Card >
                            <Select
                                showSearch
                                size="large"
                                onChange={handleSelectProcess}
                                allowClear
                                placeholder="Chọn tên quy trình"
                                style={{ width: '100%' }}
                                options={allProcessNames.map(name => ({ label: name, value: name }))}
                            />
                        </Card>
                    </Col> */}
                    {/* Cột bên phải: bảng danh sách phiên bản mới nhất */}
                    <Col xs={24} sm={8}>
                        <Card title="Tài liệu mới" style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", marginBottom: 16 }}>
                            <Typography.Title level={2} style={{ textAlign: "center" }}>
                                {taiLieuMoi.length}
                            </Typography.Title>
                        </Card>
                    </Col>
                    <Col xs={24} sm={24}>
                        <Card style={{ backgroundColor: '', border: 'none', boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                            {loading ? <Spin /> : <Table
                                dataSource={data}
                                columns={columns}
                                rowKey="VersionId"
                                className={style.tableVersions}
                                scroll={{ y: 55 * 9 }}
                                onRow={(record) => ({
                                    onClick: () => handleViewPdf(record)
                                })}
                                rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                            />}
                        </Card>
                    </Col>
                </Row>
                {/* Modal hiển thị tất cả các phiên bản của quy trình được chọn */}
                <Modal
                    title={modalTitle}
                    visible={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    className={style.modalVersions}
                    footer={[
                        <Button key="close" onClick={() => setModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    width="90%"
                >
                    <Table
                        dataSource={modalData}
                        columns={modalColumns}
                        rowKey="VersionId"
                        className={style.tableVersions}
                        scroll={{ y: 55 * 9 }}
                        pagination={false}
                        onRow={(record) => ({ onClick: () => handleViewPdf(record) })}
                        rowClassName={(record) => record.TrangThai === 'Chưa xem' ? style.notViewed : ''}
                    />
                    {/* Modal thêm phiên bản */}
                </Modal>
                {/* Modal nhập nhận xét */}
                <Modal
                    title="Nhập nhận xét"
                    open={isCommentModalVisible}
                    onOk={handleConfirmComment}
                    onCancel={() => setIsCommentModalVisible(false)}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    className={style.modalComment}
                >
                    <p>Chọn nhận xét của bạn:</p>
                    <Select
                        placeholder="Chọn nhận xét"
                        style={{ width: "100%" }}
                        value={comment}
                        onChange={(value) => setComment(value)}
                        options={[
                            { value: "Tiếp nhận", label: "Tiếp nhận" },
                            { value: "Đào tạo", label: "Đào tạo" },
                            { value: "Tuân thủ", label: "Tuân thủ" }
                        ]}
                    />
                </Modal>
                <Modal
                    title="Nhập Dữ Liệu Tạo DOCX"
                    open={isModalSuaDoiOpen}
                    onCancel={() => setIsModalSuaDoiOpen(false)}
                    footer={null}
                    width={800}
                >
                    <Form form={formSuaDoi} layout="vertical" onFinish={handleGenerate}>
                        <Form.Item label="Người yêu cầu" name="NguoiYeuCau" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Bộ phận" name="BoPhan" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>

                        <h3>Danh sách tài liệu</h3>
                        <Table
                            dataSource={taiLieuList}
                            columns={[
                                { title: "Tên tài liệu", dataIndex: "TenTaiLieu", render: (_, record) => <Input onChange={e => updateTaiLieu(record.key, "TenTaiLieu", e.target.value)} /> },
                                { title: "Mã tài liệu", dataIndex: "MaTaiLieu", render: (_, record) => <Input onChange={e => updateTaiLieu(record.key, "MaTaiLieu", e.target.value)} /> },
                                { title: "Nội dung yêu cầu", dataIndex: "NoiDungYeuCau", render: (_, record) => <Input onChange={e => updateTaiLieu(record.key, "NoiDungYeuCau", e.target.value)} /> },
                                { title: "Lý do", dataIndex: "LyDo", render: (_, record) => <Input onChange={e => updateTaiLieu(record.key, "LyDo", e.target.value)} /> },
                            ]}
                            pagination={false}
                        />
                        <Button type="dashed" onClick={addTaiLieu} style={{ marginTop: 10 }}>
                            Thêm tài liệu
                        </Button>

                        <h3>Ý kiến</h3>
                        <Form.Item label="Ý kiến của trưởng/phó bộ phận yêu cầu soạn thảo" name="YKienTruongBoPhan">
                            <Input.TextArea />
                        </Form.Item>
                        <Form.Item label="Chữ ký (ghi rõ họ tên) của trưởng/phó bộ phận" name="ChuKyTruongBoPhan">
                            <Input />
                        </Form.Item>

                        {/* <Form.Item label="Ý kiến của Bộ phận Quản lý hệ thống" name="YKienBoPhanQuanLy">
                            <Input.TextArea />
                        </Form.Item>
                        <Form.Item label="Chữ ký (ghi rõ họ tên) của Bộ phận Quản lý hệ thống" name="ChuKyBoPhanQuanLy">
                            <Input />
                        </Form.Item> */}

                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                Tạo DOCX
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
                {pdfVisible && (
                    <ViewerPDF
                        fileUrl={pdfUrl}
                        onClose={() => {
                            setPdfVisible(false);
                            if (prevModalVisible) {
                                setModalVisible(true); // Mở lại modal nếu trước đó đang mở
                            }
                        }}
                        onComment={handleOpenCommentModal}
                        onSuaDoi={handleOpenSuaDoiModal}
                    // onGopY={handleOpenGopYModal}
                    />
                )}
            </Content>
        </Layout>
    );
};

export default QLQT;
